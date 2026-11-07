# Crusade Forge

A self-contained web page for building homebrew Warhammer 40,000 (11th edition) datasheets for a Crusade force, with an automatic points calculator.

Open `index.html` in any browser – no install, no server.

## What it does

- Build a unit: name, faction, unit type, starting strength, characteristics (M, T, Sv, W, Ld, OC, InSv, Feel No Pain).
- Add ranged and melee weapons with 11th edition weapon abilities (Blast X, Cleave X, Close-Quarters, Lethal Hits, Sustained Hits, Devastating Wounds, Anti-X, Melta, Twin-linked, One Shot, Psychic and more), including weapons with two modes.
- Pick core abilities or invent your own (rated minor / major / huge).
- Keep a Crusade record (XP, rank, battle honours, scars, story).
- View a printable datasheet card, keep a roster against a supply limit, and back up / share a force as text.

## How the points are calculated

1. **Attacks** – every weapon is resolved mathematically against five targets (horde, Toughness 5 marine, elite, monster, tank), using 11th edition rules (cover is -1 to hit, Heavy, Blast/Cleave per 5 models, Hazardous on 1-2, etc.).
2. **Toughness** – the unit is attacked by nine common weapons; the number of attacks needed to kill one model is its toughness score.
3. **Calibration** – a regression fits `points per model = k × (c + attacks)^a × toughness^b × move^m × models^n` to real 11th edition datasheets (`src/refs.js`), with fixed percentage costs for abilities. Leave-one-out testing gives a median error of about 11%.

Reference points can be edited in the app ("How points work" tab) and the formula re-learns instantly.

## Files

| File | Purpose |
|---|---|
| `index.html` | The built, self-contained app |
| `src/app.html` | Page template (UI) |
| `src/engine.js` | Points engine |
| `src/refs.js` | Reference datasheets used for calibration |
| `build.py` | Inlines the engine and references into `index.html` |

Rebuild after editing anything in `src/`:

```
python3 build.py
```

## Notes

Unofficial fan tool, not affiliated with Games Workshop. Reference stats and points summarised from 11th edition datasheets (November 2026); points change often.

Saving to an account only works when the page is hosted as a Claude artifact; elsewhere it saves in the browser (localStorage) and supports copy/paste backups.
