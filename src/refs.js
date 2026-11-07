// 11th edition reference datasheets used to calibrate the points model.
// Profiles summarised from 11th edition datasheets (Wahapedia, Nov 2026); points are the
// matched-play cost for your first copies of the unit, with default wargear.
// Weapon ability tags ending ":inf" only apply against non-Monster/Vehicle targets.
const REFS_VERSION = '11e-2026-11';
const REFS = (() => {
  const W = (name, range, A, BS, S, AP, D, kw = '', carriers = 0, qty = 1, alt = false) => ({ name, range, A, BS, S, AP, D, kw, carriers, qty, alt });
  const ALT = (name, range, A, BS, S, AP, D, kw = '') => W(name, range, A, BS, S, AP, D, kw, 0, 1, true);
  const U = (name, faction, models, points, M, T, Sv, Wd, Ld, OC, extra, weapons) => Object.assign(
    { name, faction, models, points, M, T, Sv, W: Wd, Ld, OC, inv: 0, fnp: 0, abilities: [], custom: [], keywords: ['infantry'], weapons }, extra);
  const veh = ['vehicle'], mon = ['monster'];
  const minor = n => ({ name: n, tier: 'minor' }), major = n => ({ name: n, tier: 'major' });
  return [
    U('Intercessor Squad', 'Space Marines', 5, 85, 6, 5, 3, 2, 6, 2, { custom: [minor('Bolter Discipline'), minor('Tactical Mainstay')] }, [
      W('Bolt rifle (focused fire)', 24, 1, 3, 6, 1, 2, 'rf1 heavy'), ALT('Bolt rifle (saturation)', 24, 2, 3, 5, 1, 1, 'assault rf1'),
      W('Bolt pistol', 12, 1, 3, 5, 1, 1, 'cq'), W('Knives and fists', 0, 3, 3, 5, 0, 1)]),
    U('Assault Intercessor Squad', 'Space Marines', 5, 85, 6, 5, 3, 2, 6, 2, { custom: [minor('Targeted Intercession')] }, [
      W('Heavy bolt pistol', 18, 1, 3, 5, 1, 1, 'cq'), W('Chainsword', 0, 4, 3, 5, 1, 1)]),
    U('Terminator Squad', 'Space Marines', 5, 190, 5, 6, 2, 3, 6, 1, { inv: 4, abilities: ['deepstrike'], custom: [major('Fury of the First')] }, [
      W('Storm bolter', 24, 2, 3, 5, 1, 1, 'rf2'), W('Power fist', 0, 3, 3, 8, 2, 2)]),
    U('Hellblaster Squad', 'Space Marines', 5, 115, 6, 5, 3, 2, 6, 1, {}, [
      W('Plasma incinerator (standard)', 24, 2, 3, 7, 2, 2, 'assault rf1'), ALT('Plasma incinerator (supercharge)', 24, 2, 3, 8, 3, 2, 'assault rf1 hazardous'),
      W('Bolt pistol', 12, 1, 3, 5, 1, 1, 'cq'), W('Ceramite fists', 0, 3, 3, 5, 0, 1)]),
    U('Eradicator Squad with Melta Rifles', 'Space Marines', 3, 100, 5, 6, 3, 3, 6, 1, { abilities: ['rerolldamage'] }, [
      W('Melta rifle', 18, 1, 3, 10, 3, 'D3+2', 'melta2'), ALT('Melta rifle (hunter)', 18, 1, 2, 12, 3, 'D3+2', 'melta2 hunter'),
      W('Bolt pistol', 12, 1, 3, 5, 1, 1, 'cq'), W('Ceramite fists', 0, 3, 3, 5, 0, 1)]),
    U('Redemptor Dreadnought', 'Space Marines', 1, 170, 8, 10, 2, 12, 6, 4, { keywords: veh, abilities: ['minus1wound', 'deadlydemise', 'damaged'] }, [
      W('Heavy onslaught gatling cannon', 24, 12, 3, 6, 1, 1, 'dev:inf sus2:inf'), W('Fragstorm grenade launchers', 18, 6, 3, 4, 1, 1, 'blast2'),
      W('Heavy flamer', 12, 3, 3, 5, 1, 1, 'torrent blast2'), W('Redemptor fist', 0, 5, 3, 12, 3, 'D3+3')]),
    U('Gladiator Lancer', 'Space Marines', 1, 160, 10, 10, 3, 12, 6, 3, { keywords: veh, abilities: ['rerollone', 'deadlydemise', 'damaged'] }, [
      W('Laser destroyer', 72, 2, 3, 14, 3, 'D6+3', 'heavy'), W('Defensive array', 24, 6, 3, 5, 1, 1, 'rf6'), W('Armoured hull', 0, 3, 4, 6, 0, 1)]),
    U('Land Raider', 'Space Marines', 1, 245, 10, 12, 2, 16, 6, 5, { keywords: veh, abilities: ['transport', 'rerollone', 'deadlydemise', 'damaged'], capacity: 14, custom: [minor('Assault Ramp')] }, [
      W('Godhammer lascannon', 48, 2, 3, 12, 3, 'D3+3', '', 0, 2), W('Twin heavy bolter', 36, 3, 3, 5, 1, 2, 'twin sus1 rf2'), W('Armoured tracks', 0, 6, 4, 8, 0, 1)]),
    U('Rhino', 'Space Marines', 1, 70, 12, 9, 3, 10, 6, 2, { keywords: veh, abilities: ['transport', 'firingdeck', 'deadlydemise'], capacity: 12 }, [
      W('Storm bolter', 24, 2, 3, 5, 1, 1, 'rf2'), W('Armoured tracks', 0, 3, 4, 6, 0, 1)]),
    U('Captain', 'Space Marines', 1, 90, 6, 5, 3, 5, 6, 1, { inv: 4, abilities: ['leader'], custom: [major('Finest Hour'), minor('Strategic Acumen')] }, [
      W('Master-crafted bolter', 24, 2, 2, 5, 1, 2, 'rf1 assault'), W('Heavy bolt pistol', 18, 1, 2, 5, 1, 1, 'cq'), W('Master-crafted power weapon', 0, 6, 2, 6, 2, 2)]),
    U('Bladeguard Veteran Squad', 'Space Marines', 3, 90, 6, 5, 3, 3, 6, 1, { inv: 4, custom: [major('Bladeguard')] }, [
      W('Heavy bolt pistol', 18, 1, 3, 5, 1, 1, 'cq'), W('Master-crafted power sword', 0, 4, 3, 5, 2, 2)]),
    U('Scout Squad', 'Space Marines', 5, 65, 6, 4, 4, 2, 6, 1, { abilities: ['infiltrators', 'scouts'] }, [
      W('Boltgun', 24, 1, 3, 5, 1, 1, 'rf1'), W('Bolt pistol', 12, 1, 3, 5, 1, 1, 'cq'), W('Combat knife', 0, 3, 3, 4, 1, 1)]),
    U('Boyz', 'Orks', 10, 85, 6, 5, 5, 1, 7, 2, { custom: [minor('Ammo Runts'), minor('Tide of Muscle')] }, [
      W('Shoota', 18, 2, 5, 4, 0, 1, 'lethal:inf rf1', 9), W('Kombi-skorcha (skorcha)', 12, 3, 5, 5, 0, 1, 'torrent blast1', 1),
      W('Slugga', 12, 1, 5, 4, 0, 1, 'cq lethal:inf'), W('Kustom choppa', 0, 4, 3, 5, 2, 2, '', 1), W('Choppa', 0, 3, 3, 5, 1, 1)]),
    U('Nobz', 'Orks', 5, 115, 6, 5, 4, 3, 7, 1, { custom: [minor('Ammo Runts'), minor('Get Out da Way!')] }, [
      W('Kustom shoota', 18, 4, 5, 4, 0, 1, 'lethal:inf rf2'), W('Kustom krumpa', 0, 3, 3, 10, 2, 2, 'rrhit twin')]),
    U('Warboss', 'Orks', 1, 100, 6, 6, 4, 6, 6, 1, { inv: 5, abilities: ['leader'], custom: [major('Might Is Right'), minor('Intimidating Motivation')] }, [
      W('Kustom shoota', 18, 4, 5, 4, 0, 1, 'lethal:inf rf2'), W('Kustom choppa', 0, 6, 2, 7, 2, 2, 'cleave2')]),
    U('Termagants', 'Tyranids', 10, 55, 6, 3, 5, 1, 8, 2, { custom: [minor('Skulking Horrors')] }, [
      W('Fleshborer', 18, 1, 4, 5, 0, 1, 'assault'), W('Chitinous claws and teeth', 0, 1, 4, 3, 0, 1)]),
    U('Hive Tyrant', 'Tyranids', 1, 195, 8, 10, 2, 10, 7, 3, { keywords: mon, inv: 4, abilities: ['leader', 'psyker', 'deadlydemise'], custom: [major('Onslaught aura'), minor('Will of the Hive Mind')] }, [
      W('Monstrous bonesword and lash whip', 0, 6, 2, 9, 2, 3, 'twin'), W('Monstrous scything talons', 0, 4, 2, 7, 2, 2, 'extra')]),
    U('Carnifexes', 'Tyranids', 1, 90, 8, 9, 2, 8, 8, 3, { keywords: mon, abilities: ['deadlydemise'], custom: [minor('Blistering Assault')] }, [
      W('Carnifex scything talons', 0, 6, 4, 9, 2, 3), W('Carnifex extra scything talons', 0, 2, 4, 9, 2, 3, 'extra')]),
    U('Necron Warriors', 'Necrons', 10, 85, 5, 4, 4, 1, 7, 2, { abilities: ['regen'] }, [
      W('Gauss flayer', 24, 1, 4, 4, 0, 1, 'lethal rf1'), W('Close combat weapon', 0, 1, 4, 4, 0, 1)]),
    U('Cadian Shock Troops', 'Astra Militarum', 10, 70, 6, 3, 5, 1, 7, 2, { abilities: ['sticky'] }, [
      W('Lasgun', 24, 1, 4, 3, 0, 1, 'rf1', 9), W('Laspistol', 12, 1, 4, 3, 0, 1, 'cq', 1),
      W('Chainsword', 0, 3, 4, 3, 0, 1, '', 1), W('Close combat weapon', 0, 1, 4, 3, 0, 1)]),
    U('Leman Russ Battle Tank', 'Astra Militarum', 1, 165, 10, 11, 2, 13, 7, 3, { keywords: veh, abilities: ['reroll1s', 'deadlydemise', 'damaged'] }, [
      W('Leman Russ battle cannon', 48, 'D6+3', 4, 10, 1, 3, 'blast1'), W('Lascannon', 48, 1, 4, 12, 3, 'D6+1'), W('Armoured tracks', 0, 6, 4, 7, 0, 1)]),
    U('Custodian Guard', 'Adeptus Custodes', 4, 180, 6, 6, 2, 3, 6, 2, { inv: 4, abilities: ['deepstrike', 'rerollw1s'], custom: [major('Sentinel Storm')] }, [
      W('Guardian spear', 24, 2, 2, 5, 1, 2, 'assault'), W('Guardian spear (melee)', 0, 5, 2, 7, 2, 2)]),
    U('Legionaries', 'Chaos Space Marines', 5, 95, 6, 5, 3, 2, 6, 2, { abilities: ['rerollw1s'], custom: [minor('Dark Pacts')] }, [
      W('Boltgun', 24, 2, 3, 5, 1, 1), W('Bolt pistol', 12, 1, 3, 5, 1, 1, 'cq'), W('Close combat weapon', 0, 3, 3, 5, 0, 1)]),
    U('Wraithknight', 'Aeldari', 1, 385, 12, 12, 2, 18, 6, 10, { keywords: mon, inv: 4, abilities: ['minus1dmg', 'deadlydemise', 'damaged'], custom: [minor('Point-blank Devastation')] }, [
      W('Suncannon', 48, 'D6+4', 3, 10, 3, 3, 'blast1'), W('Titanic feet', 0, 5, 3, 8, 1, 2)]),
    U('Armiger Warglaive', 'Imperial Knights', 1, 140, 12, 9, 3, 14, 7, 6, { keywords: veh, inv: 5, abilities: ['deadlydemise', 'damaged'], custom: [minor('Impetuous Glory')] }, [
      W('Thermal spear', 18, 2, 3, 12, 4, 'D6', 'melta4'), W('Questoris heavy stubber', 36, 3, 3, 4, 1, 1, 'rf3'),
      W('Reaper chain-cleaver (strike)', 0, 4, 3, 10, 3, 3), ALT('Reaper chain-cleaver (sweep)', 0, 8, 3, 8, 2, 1)]),
  ];
})();
if (typeof module !== 'undefined') module.exports = REFS;
