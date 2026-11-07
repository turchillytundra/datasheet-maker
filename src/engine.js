// ===== Crusade Forge points engine =====
// Values a datasheet by simulating its offence vs a basket of targets and its toughness vs a
// basket of attackers, then fits a power-law model to reference datasheets with known points.

const ENGINE = (() => {
  let OFFC = 1;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

  // "D6+3" -> 6.5, "2D6" -> 7, "D3" -> 2, "4" -> 4
  function dice(v) {
    if (typeof v === 'number') return v;
    const s = String(v || '').toUpperCase().replace(/\s/g, '');
    if (!s) return 0;
    let total = 0;
    for (const part of s.split('+')) {
      const m = part.match(/^(\d*)D(\d+)$/);
      if (m) total += (m[1] ? +m[1] : 1) * (+m[2] + 1) / 2;
      else if (!isNaN(+part)) total += +part;
    }
    return total;
  }

  // Parse weapon ability keywords: "assault heavy rf1 sus1 melta2 anti-vehicle4 dev twin ..."
  function parseKw(str) {
    const k = { cond: {} };
    for (let t of String(str || '').toLowerCase().split(/[\s,]+/).filter(Boolean)) {
      let cond = null, m;
      if (t.includes(':')) { [t, cond] = t.split(':'); }
      if ((m = t.match(/^(rf|sus|melta|blast|cleave)(\d+)$/))) k[m[1]] = +m[2];
      else if ((m = t.match(/^anti-([a-z]+)(\d)$/))) { (k.anti = k.anti || []).push([m[1], +m[2]]); }
      else if (t === 'pistol' || t === 'cq') { k.cq = 1; t = 'cq'; }
      else if (t === 'blast' || t === 'cleave') { k[t] = 1; }
      else k[t] = 1;
      if (cond && (m = t.match(/^[a-z]+/))) k.cond[m[0] === 'pistol' ? 'cq' : m[0]] = cond;
    }
    return k;
  }
  const isBig = t => t.kw.includes('monster') || t.kw.includes('vehicle');
  // drop abilities whose condition doesn't match this target (":inf" = only vs non-monster/vehicle, ":big" = only vs monster/vehicle)
  function kwFor(k, t) {
    const out = Object.assign({}, k);
    for (const [name, c] of Object.entries(k.cond || {})) {
      const ok = c === 'big' ? isBig(t) : !isBig(t);
      if (!ok) delete out[name];
    }
    return out;
  }

  function woundNeed(S, T) {
    if (S >= 2 * T) return 2;
    if (S > T) return 3;
    if (S === T) return 4;
    if (S * 2 <= T) return 6;
    return 5;
  }
  const pOf = need => clamp((7 - need) / 6, 0, 5 / 6);
  function failSave(Sv, AP, inv) {
    let eff = (Sv || 7) + (AP || 0);
    if (inv && inv < eff) eff = inv;
    if (eff <= 1) eff = 2;
    return eff > 6 ? 1 : (eff - 1) / 6;
  }

  // ---- Offence: targets (points-per-wound gives a "points removed" scale) ----
  const TARGETS = [
    { id: 'Horde',   T: 3,  Sv: 5, inv: 0, W: 1,  kw: ['infantry'], ppw: 6.5, per5: 2 },
    { id: 'Marine',  T: 5,  Sv: 3, inv: 0, W: 2,  kw: ['infantry'], ppw: 8.5, per5: 1 },
    { id: 'Elite',   T: 6,  Sv: 2, inv: 4, W: 3,  kw: ['infantry'], ppw: 12,  per5: 1 },
    { id: 'Monster', T: 9,  Sv: 2, inv: 0, W: 10, kw: ['monster'],  ppw: 11,  per5: 0 },
    { id: 'Tank',    T: 11, Sv: 2, inv: 0, W: 13, kw: ['vehicle'],  ppw: 12.5, per5: 0 },
  ];

  function weaponVsTarget(w, k0, t) {
    const k = kwFor(k0, t);
    const melee = !(w.range > 0);
    if (k.hunter && !isBig(t)) return 0;
    let A = dice(w.A) + (k.rf ? k.rf * 0.5 : 0) + (k.blast && !melee ? k.blast * t.per5 : 0) + (k.cleave && melee ? k.cleave * t.per5 : 0);
    if (A <= 0) return 0;
    let ph, crit;
    if (k.torrent && !melee) { ph = 1; crit = 0; }
    else {
      ph = pOf(+w.BS || 4);
      if (!melee && k.heavy) ph += 0.6 / 6;                    // +1 to hit if moved 3" or less (usually)
      if (!melee && !k.ic && !k.psychic && t.kw.includes('infantry')) ph -= 0.5 / 6; // 11th: cover is -1 to hit, about half the time
      ph = clamp(ph, 1 / 6, 5 / 6);
      if (k.rrhit) ph = ph + (1 - ph) * ph;
      crit = k.rrhit ? 1 / 6 + (1 - ph) / 6 : 1 / 6;
    }
    const lethal = k.lethal ? A * crit : 0;
    const hits = A * (ph - (k.lethal ? crit : 0)) + (k.sus ? A * crit * k.sus : 0);
    let need = woundNeed(+w.S || 0, t.T);
    let critT = 6;
    if (k.anti) for (const [kw, v] of k.anti) if (t.kw.includes(kw) || kw === 'all') critT = Math.min(critT, v);
    let pw = Math.max(pOf(need), pOf(critT));
    if (k.lance && melee) pw = Math.min(5 / 6, pw + 1 / 15);
    let pcw = pOf(critT);
    if (k.twin) { pcw = pcw + (1 - pw) * pcw; pw = pw + (1 - pw) * pw; }
    const wounds = hits * pw;
    const critW = k.dev ? hits * pcw : 0;
    const fail = failSave(t.Sv, +w.AP || 0, t.inv);
    const d = Math.min(dice(w.D) + (k.melta ? k.melta * 0.5 : 0), t.W);
    const dmg = ((wounds - critW + lethal) * fail + critW) * d;
    return dmg * t.ppw;
  }

  // value of one weapon against each target (range and special rules applied)
  function weaponProfile(w) {
    const k = parseKw(w.kw);
    const melee = !(w.range > 0);
    let mult = 1;
    if (!melee) {
      const r = Math.min(+w.range || 0, 48);
      mult *= 0.6 + 0.4 * r / 24 * (r > 24 ? 0.75 : 1) + (r > 24 ? 0.1 : 0);
      if (k.indirect) mult *= 1.05;
      if (k.assault) mult *= 1.03;
    }
    if (k.precision) mult *= 1.08;
    if (k.hazardous) mult *= 0.9;
    if (k.oneshot) mult *= 0.25;
    return TARGETS.map(t => weaponVsTarget(w, k, t) * mult);
  }
  function weaponValue(w) { const p = weaponProfile(w); return p.reduce((a, c) => a + c, 0) / p.length; }

  // ---- Defence: attackers basket ----
  const ATTACKERS = [
    { S: 3, AP: 0, D: 1 },        // lasgun
    { S: 5, AP: 1, D: 1 },        // boltgun (11th)
    { S: 5, AP: 1, D: 2 },        // heavy bolter
    { S: 8, AP: 3, D: 2 },        // plasma
    { S: 12, AP: 3, D: 4.5 },     // lascannon
    { S: 10, AP: 3, D: 5 },       // melta
    { S: 5, AP: 1, D: 1, m: 1 },  // chainsword
    { S: 8, AP: 2, D: 2, m: 1 },  // power fist
    { S: 12, AP: 3, D: 3, m: 1 }, // big hammer
  ];
  function toughness(u) {
    const ab = new Set(u.abilities || []);
    const W = Math.max(1, +u.W || 1);
    const T = Math.max(1, +u.T || 1);
    const pass = u.fnp ? (u.fnp - 1) / 6 : 1;
    const kws = (u.keywords || []).map(x => String(x).toLowerCase());
    const coverable = kws.some(x => ['infantry', 'beast', 'swarm'].includes(x)) && !kws.some(x => x === 'vehicle' || x === 'monster');
    let logSum = 0;
    for (const a of ATTACKERS) {
      let ph = 4 / 6;
      if (!a.m) ph -= ab.has('stealth') ? 1 / 6 : coverable ? 0.5 / 6 : 0;
      let need = woundNeed(a.S, T);
      if (ab.has('minus1wound') && a.S > T) need = Math.min(6, need + 1);
      const pw = pOf(need);
      const pf = failSave(+u.Sv || 7, a.AP, +u.inv || 0);
      let D = a.D;
      if (ab.has('minus1dmg')) D = Math.max(1, D - 1);
      if (ab.has('halfdmg')) D = Math.max(1, D / 2);
      const d = Math.min(D, W);
      const unsavedNeeded = Math.ceil(W / d - 1e-9) / pass;
      const attacks = unsavedNeeded / Math.max(1e-6, ph * pw * pf);
      logSum += Math.log(attacks);
    }
    return Math.exp(logSum / ATTACKERS.length);
  }

  // ---- Abilities: value multipliers (fixed, not fitted) ----
  const ABILITIES = {
    deepstrike:   { label: 'Deep Strike', pct: 8, cap: 40, tip: 'Arrives from reserves anywhere more than 8" from enemies' },
    scouts:       { label: 'Scouts', pct: 5, cap: 25, tip: 'Free move before the battle' },
    infiltrators: { label: 'Infiltrators', pct: 6, cap: 30, tip: 'Deploys anywhere more than 8" from enemies' },
    stealth:      { label: 'Stealth', pct: 0, tip: '-1 to be hit by ranged attacks (worked out in toughness)' },
    loneop:       { label: 'Lone Operative', pct: 12, cap: 50, tip: "Can't be seen from more than 12\" away" },
    fightsfirst:  { label: 'Fights First', pct: 6, cap: 30, tip: 'Fights before other units' },
    fly:          { label: 'Fly', pct: 4, cap: 20, tip: 'Moves over models and terrain' },
    supreme:      { label: 'Supreme Commander', pct: 0, kwOnly: true, tip: 'Adds the SUPREME COMMANDER keyword (must be your Warlord). Free – no points.' },
    leader:       { label: 'Leader', pct: 15, cap: 35, tip: 'Can join a unit and lead it' },
    support:      { label: 'Support', pct: 8, cap: 20, tip: 'Can join a unit alongside a Leader' },
    reroll1s:     { label: 'Re-roll hit rolls of 1', pct: 0, off: 1.1, tip: 'Applied to attacks' },
    rerollw1s:    { label: 'Re-roll wound rolls of 1', pct: 0, off: 1.08, tip: 'Applied to attacks' },
    rerollone:    { label: 'Re-roll one hit and one wound', pct: 0, off: 1.06, tip: 'Applied to attacks' },
    rerollhits:   { label: 'Re-roll all hits', pct: 0, off: 1.25, tip: 'Applied to attacks' },
    rerollwounds: { label: 'Re-roll all wounds', pct: 0, off: 1.25, tip: 'Applied to attacks' },
    rerolldamage: { label: 'Re-roll damage rolls', pct: 0, off: 1.08, tip: 'Applied to attacks' },
    plus1hit:     { label: '+1 to hit', pct: 0, off: 1.2, tip: 'Applied to attacks' },
    minus1dmg:    { label: '-1 Damage taken', pct: 0, tip: 'Worked out in toughness' },
    minus1wound:  { label: '-1 to be wounded (vs stronger)', pct: 0, tip: 'Worked out in toughness' },
    halfdmg:      { label: 'Halve damage taken', pct: 0, tip: 'Worked out in toughness' },
    sticky:       { label: 'Sticky objectives', pct: 4, cap: 15, tip: 'Keeps objectives after leaving' },
    advcharge:    { label: 'Advance and charge', pct: 6, cap: 25, tip: 'Can charge after advancing' },
    fallback:     { label: 'Fall back and shoot/charge', pct: 5, cap: 20, tip: 'Still acts after falling back' },
    psyker:       { label: 'Psyker', pct: 3, cap: 15, tip: 'Has psychic powers' },
    regen:        { label: 'Heals / brings models back', pct: 8, cap: 40, tip: 'Reanimation, regeneration, etc.' },
    transport:    { label: 'Transport', pct: 0, tip: 'Carries other models (set capacity)' },
    firingdeck:   { label: 'Firing Deck', pct: 3, cap: 15, tip: 'Passengers can shoot out' },
    deadlydemise: { label: 'Deadly Demise', pct: 1, cap: 5, tip: 'Explodes when destroyed' },
    damaged:      { label: 'Damaged', pct: -3, tip: 'Gets worse when badly hurt (big models)' },
  };
  const CUSTOM_TIERS = { minor: 5, major: 12, huge: 25 };
  const CUSTOM_CAPS = { minor: 15, major: 35, huge: 60 };

  // Points added by abilities. Each ability is a percentage of the unit's core cost, but capped,
  // and a long list of abilities has diminishing returns – so a big hero doesn't double in price.
  function abilityPoints(u, core) {
    let pos = 0, neg = 0;
    const add = (pct, cap) => { const v = core * pct / 100; if (v >= 0) pos += Math.min(v, cap == null ? Infinity : cap); else neg += v; };
    for (const a of u.abilities || []) if (ABILITIES[a] && ABILITIES[a].pct) add(ABILITIES[a].pct, ABILITIES[a].cap);
    for (const c of u.custom || []) if (CUSTOM_TIERS[c.tier]) add(CUSTOM_TIERS[c.tier], CUSTOM_CAPS[c.tier]);
    const eff = pos > 0 ? pos * core / (core + 0.75 * pos) : 0;
    return eff + neg;
  }
  function abilityMult(u) { return 1; } // kept for compatibility

  function offMult(u) {
    let m = 1;
    for (const a of u.abilities || []) if (ABILITIES[a] && ABILITIES[a].off) m *= ABILITIES[a].off;
    return m;
  }

  // Unit offence split into ranged and melee (per model averages).
  // A weapon marked alt:true is another mode of the weapon above it: the best mode is used against each target.
  function groups(weapons) {
    const out = [];
    for (const w of weapons || []) {
      if (w.alt && out.length && (out[out.length - 1].melee === !(w.range > 0))) out[out.length - 1].list.push(w);
      else out.push({ melee: !(w.range > 0), list: [w] });
    }
    return out.map(g => {
      const profs = g.list.map(weaponProfile);
      const best = TARGETS.map((_, i) => Math.max(...profs.map(p => p[i])));
      const head = g.list[0];
      const k = parseKw(head.kw);
      return { melee: g.melee, v: best.reduce((a, c) => a + c, 0) / best.length, head, k };
    });
  }
  function offence(u) {
    const N = Math.max(1, +u.models || 1);
    let rangedMain = 0, cq = 0, melee = 0;
    const meleeList = [];
    for (const g of groups(u.weapons)) {
      const w = g.head;
      const carriers = w.carriers ? Math.min(+w.carriers, N) : N;
      const qty = Math.max(1, +w.qty || 1);
      if (!g.melee) {
        if (g.k.cq) cq += g.v * carriers * qty; else rangedMain += g.v * carriers * qty;
      } else if (g.k.extra) melee += g.v * carriers * qty;
      else meleeList.push({ v: g.v * qty, carriers });
    }
    const ranged = Math.max(rangedMain, cq) + 0.15 * Math.min(rangedMain, cq);
    meleeList.sort((a, b) => b.v - a.v);
    let left = N;
    for (const m of meleeList) { const n = Math.min(left, m.carriers); melee += m.v * n; left -= n; if (left <= 0) break; }
    const om = offMult(u);
    return { ranged: ranged * om / N, melee: melee * om / N };
  }

  // ---- Calibrated model ----
  // log(ppm / abilityMult) = b0 + b1*log(1+Off) + b2*log(Def) + b3*log(M) + b4*log(1+OC)
  function features(u, mu) {
    const o = offence(u);
    const off = o.ranged + mu * o.melee;
    const def = toughness(u);
    const M = Math.max(1, +u.M || 1) + ((u.abilities || []).includes('fly') ? 2 : 0);
    return [1, Math.log(OFFC + off), Math.log(def), Math.log(M), Math.log(Math.max(1, +u.models || 1))];
  }

  function solve(A, b) { // gaussian elimination
    const n = b.length;
    for (let i = 0; i < n; i++) {
      let p = i; for (let r = i + 1; r < n; r++) if (Math.abs(A[r][i]) > Math.abs(A[p][i])) p = r;
      [A[i], A[p]] = [A[p], A[i]]; [b[i], b[p]] = [b[p], b[i]];
      for (let r = i + 1; r < n; r++) { const f = A[r][i] / A[i][i]; for (let c = i; c < n; c++) A[r][c] -= f * A[i][c]; b[r] -= f * b[i]; }
    }
    const x = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) { let s = b[i]; for (let c = i + 1; c < n; c++) s -= A[i][c] * x[c]; x[i] = s / A[i][i]; }
    return x;
  }
  // least squares with the speed exponent kept sensible (faster should never be cheaper)
  const SPEED_MIN = 0.12;
  function fitBeta(X, y) {
    let b = ols(X, y);
    if (b[3] < SPEED_MIN) {
      const X2 = X.map(r => r.filter((_, i) => i !== 3));
      const y2 = y.map((v, i) => v - SPEED_MIN * X[i][3]);
      const b2 = ols(X2, y2);
      b = [b2[0], b2[1], b2[2], SPEED_MIN, ...b2.slice(3)];
    }
    return b;
  }
  function ols(X, y, lambda = 0.05) {
    const p = X[0].length;
    const A = Array.from({ length: p }, () => new Array(p).fill(0));
    const b = new Array(p).fill(0);
    for (let i = 0; i < X.length; i++) for (let r = 0; r < p; r++) { b[r] += X[i][r] * y[i]; for (let c = 0; c < p; c++) A[r][c] += X[i][r] * X[i][c]; }
    for (let r = 1; r < p; r++) A[r][r] += lambda;
    return solve(A, b);
  }
  // invert points = core + abilityPoints(core) + transport to find the core cost of a reference unit
  function coreOf(u) {
    const P = (+u.points) - transportPts(u);
    let core = P;
    for (let i = 0; i < 30; i++) core = Math.max(1, P - abilityPoints(u, core));
    return core;
  }
  const target = u => Math.log(coreOf(u) / Math.max(1, +u.models));
  function transportPts(u) { return (u.abilities || []).includes('transport') ? 1.5 * (+u.capacity || 0) : 0; }

  function fit(refs) {
    let best = null;
    for (const c of [0.5, 1, 2, 3, 5]) for (const mu of [0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.2]) {
      OFFC = c;
      const X = refs.map(u => features(u, mu));
      const y = refs.map(target);
      // leave-one-out error
      let errs = [];
      for (let i = 0; i < refs.length; i++) {
        const Xi = X.filter((_, j) => j !== i), yi = y.filter((_, j) => j !== i);
        const beta = fitBeta(Xi, yi);
        const pred = predictWith(refs[i], beta, mu);
        errs.push(Math.abs(pred - refs[i].points) / refs[i].points);
      }
      errs = errs.slice().sort((a, b) => a - b);
      const med = errs[Math.floor(errs.length / 2)];
      const mean = errs.reduce((a, b) => a + b, 0) / errs.length;
      if (!best || mean < best.mean) best = { mu, c, beta: fitBeta(X, y), med, mean, errs };
    }
    OFFC = best.c;
    return best;
  }
  function predictWith(u, beta, mu) {
    const f = features(u, mu);
    const lp = f.reduce((s, x, i) => s + x * beta[i], 0);
    const core = Math.exp(lp) * Math.max(1, +u.models);
    return core + abilityPoints(u, core) + transportPts(u);
  }
  function breakdown(u, model, refs) {
    const f = features(u, model.mu);
    const b = model.beta;
    const raw = predictWith(u, b, model.mu);
    const core = Math.exp(f.reduce((a, x, i) => a + x * b[i], 0)) * Math.max(1, +u.models);
    const abilityPts = abilityPoints(u, core);
    // share of core points by how far above the weakest reference each feature sits
    const F = refs.map(r => features(r, model.mu));
    const names = ['Attacks', 'Toughness', 'Speed'];
    const raws = names.map((_, i) => Math.max(0.02, b[i + 1] * (f[i + 1] - Math.min(...F.map(x => x[i + 1])) + 0.3)));
    const tot = raws.reduce((a, c) => a + c, 0);
    const parts = {};
    names.forEach((n, i) => parts[n] = core * raws[i] / tot);
    // outside reference range?
    const warn = [];
    [['attacks', 1], ['toughness', 2], ['speed', 3]].forEach(([n, i]) => {
      const mx = Math.max(...F.map(x => x[i])), mn = Math.min(...F.map(x => x[i]));
      if (f[i] > mx + 0.4) warn.push('more ' + n + ' than anything in the reference list');
      if (f[i] < mn - 0.4) warn.push('less ' + n + ' than anything in the reference list');
    });
    // nearest reference datasheets
    const sd = [1, 2, 3, 4].map(i => { const v = F.map(x => x[i]); const m = v.reduce((a, c) => a + c, 0) / v.length; return Math.sqrt(v.reduce((a, c) => a + (c - m) ** 2, 0) / v.length) || 1; });
    const near = refs.map((r, j) => ({ r, d: Math.sqrt([1, 2, 3, 4].reduce((a, i, k) => a + ((F[j][i] - f[i]) / sd[k]) ** 2, 0)) }))
      .sort((a, c) => a.d - c.d).slice(0, 3);
    const o = offence(u);
    return { raw, parts, abilityPts, transport: transportPts(u), ranged: o.ranged, melee: o.melee, tough: toughness(u), warn, near };
  }
  const round5 = x => Math.max(5, Math.round(x / 5) * 5);

  return { dice, parseKw, weaponValue, weaponProfile, groups, toughness, offence, features, fit, predictWith, breakdown, round5, ABILITIES, CUSTOM_TIERS, CUSTOM_CAPS, TARGETS, abilityMult, abilityPoints };
})();
if (typeof module !== 'undefined') module.exports = ENGINE;
