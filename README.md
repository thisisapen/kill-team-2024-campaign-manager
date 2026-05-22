# Kill Team: Ctesiphus Expedition — Campaign Tracker

A browser-based campaign management tool to generate maps and management campaigns for games similiar to the **Kill Team (2024)** Ctesiphus Expedition campaign. No server, no build tools, no dependencies — open `index.html` and play.

---

## Features

### Map Tab
- **Freeform hex placement** — click ghost indicators (dashed blue hexes) to place new hexes edge-to-edge, building any shape of map
- **Flat-top hexes** with odd-q offset geometry; numbered and named per hex
- **Hex types**: Surface, Tomb, Blocked — painted individually or via brush mode
- **Setup mode** — paint-bucket style: enable Setup, choose a brush (Surface / Tomb / Blocked / Clear), click any placed hex to repaint it
- **Pre-configured Maps** — load one of 5 predefined layouts from the dropdown (*Ctesiphus Expedition – Maps 1–5*)
- **Auto-generate** — procedurally fill hex types in centralised or chunked style with configurable depth/cluster settings; automatically places 3–4 blocked hexes (maps < 37 hexes) or 4–5 (maps 37+)
- **Explore animation** — clicking "Explore Hex" triggers a slot-machine reveal rolling through location and condition entries before locking in the result
- **Solo/Coop threat roll popup** — after exploring a tomb hex the app prompts you to roll D6 and applies the result, or rolls automatically if Auto-roll Threat is enabled
- **One-time tomb warning** — on first tomb hex exploration in Solo/Coop mode, a popup explains the full threat rules; can be dismissed permanently for the campaign
- **Hex detail panel** — select any hex to edit its number, name, type, explore results, reserves, beast/prisoner flags, and freeform notes; blocked hexes show the location/condition that caused the block
- **Kill-team flags** — mark which hexes are bases or camp sites for each kill team
- **Zoom controls** — zoom in/out or fit the entire map to the available space
- **Clear Map** — wipe all hexes with a confirmation prompt

### Kill Teams Tab
- Add any number of kill teams
- Select the team type from all **32 official Kill Team (2024) factions**
- Track operatives with name, type, status (Active / Injured / Casualty), XP, and injuries
- Colour-coded status indicators and summary pip track at a glance
- Objective tracker and freeform notes per team

### Campaign Log Tab
- **Round & phase tracker** — displays current round and phase (Movement → Battle → Action → Threat); advance or revert one phase at a time; ending the Threat phase increments the round
- **Phase tooltips** — hover `?` icons next to each phase name for a summary of what happens in that phase
- **Threat meter** — visual pip meter showing current threat vs. maximum
- **Solo Threat Controls** (Solo/Coop mode only):
  - Raise threat via D6 rolls (Explore Tomb 4+, Battle Win 3+, Battle Loss/Draw 5+, Search 5+, Doomsday Vault/Power Cell +D3)
  - Lower threat via Resupply (−1 any hex, −D3 base/camp) with a hard cap of 3 uses per campaign
  - Manual ±1 override for bookkeeping
- **Multiplayer Threat Controls** — simple +1/−1 buttons
- Timestamped manual log entries

### Generator Tab
- Standalone D36 roller for all four tables: Surface Location, Surface Condition, Tomb Location, Tomb Condition
- Independent of the campaign — all results are always possible regardless of what's on the map

### Settings Tab
- Rename the campaign
- Toggle Solo/Coop vs. Multiplayer mode
- Set Max Threat Level (campaign ends when reached)
- Adjust current round
- Toggle **Auto-roll Threat (Solo)** — when off, a popup lets you roll manually; when on, the D6 is rolled automatically and shown as a toast
- Export campaign to JSON / Import from JSON
- `?` help icon tooltips on key fields explaining the relevant rules

---

## Getting Started

1. Clone or download this repository
2. Open `index.html` in any modern browser (Chrome, Firefox, Safari, Edge)
3. No installation, no build step required

```
killteam24-campaign-map/
├── index.html          # Entry point
├── favicon.svg         # Hex icon
├── css/
│   └── style.css       # Dark Necron theme, all styles
├── js/
│   ├── app.js          # State management, tab routing, Kill Teams / Log / Settings UIs
│   ├── data.js         # D36 roll tables (locations, conditions, rules text)
│   ├── generator.js    # Dice functions, Generator tab UI
│   └── hexmap.js       # SVG hex map, placement, explore mechanics, pre-configured maps
```

---

## How to Use the Map

### Placing hexes
1. Click **📌 Place** in the map toolbar to enter placement mode
2. Dashed blue ghost hexes appear at every valid adjacent position
3. Click a ghost to place a hex there — it is automatically numbered
4. Click **📌 Place** again to exit placement mode

### Painting hex types
- Click any placed hex to select it, then use the type buttons in the detail panel; or
- Enable **✎ Setup** in the toolbar, choose a brush (Surface / Tomb / Blocked / Clear), then click hexes directly

### Exploring a hex
1. Select an unexplored Surface or Tomb hex
2. Click **Explore Hex** in the detail panel
3. Watch the slot-machine animation roll through locations and conditions
4. Click **Confirm** to apply the result — the hex is marked explored and its location code appears on the map
5. In Solo/Coop mode, tomb hexes trigger a D6 threat roll (manual popup or auto, depending on Settings)

### Loading a pre-configured map
1. Open the **Pre-configured Maps** dropdown at the left of the map toolbar
2. Select a map — you will be asked to confirm (this replaces the current layout)
3. The map loads immediately; explore hexes as normal

---

## Data & Persistence

All campaign data is saved to **`localStorage`** under the key `killteam24_campaign`. Data persists across page refreshes in the same browser profile. Nothing is sent to any server.

To export / back up your campaign, use the Export button in Settings (produces a `.json` file). To restore, use Import.

---

## Roll Tables

Hex exploration uses a **D36 mechanic**: roll a D3 (tens digit) and a D6 (units digit) to produce results in the range 11–16, 21–26, 31–36. There are four tables:

| Table | Used for |
|---|---|
| Surface Location | Exploring a Surface hex — what is found there |
| Surface Condition | Exploring a Surface hex — environmental hazard |
| Tomb Location | Exploring a Tomb hex — what is found there |
| Tomb Condition | Exploring a Tomb hex — environmental hazard |

Unique results (all except *Ruin* and *Clear Conditions*) cannot be duplicated across the map. The roller automatically re-rolls if a unique slot is already taken.

---

## Kill Team Factions Supported (32)

Angels of Death · Battleclade · Blades of Khaine · Brood Brothers · Canoptek Circle · Celestian Insidiants · Chaos Cult · Deathwatch · Exaction Squad · Farstalker Kinband · Fellgor Ravagers · Goremongers · Hand of the Archon · Hearthkyn Salvagers · Hernkyn Yaegirs · Hierotek Circle · Imperial Navy Breachers · Kasrkin · Mandrakes · Murderwing · Nemesis Claw · Plague Marines · Ratlings · Raveners · Sanctifiers · Scout Squad · Spectre Squad · Tempestus Aquilons · Vespid Stingwings · Wolf Scouts · Wrecka Krew · XV26 Stealth Battlesuits

---

## Technical Notes

- **Pure vanilla JS/HTML/CSS** — no frameworks, no npm, no build tooling
- **Hex geometry**: flat-top hexes, odd-q column offset. Centre formula: `cx = 1.5 × size × col`, `cy = √3 × size × row + (odd col ? √3/2 × size : 0)`
- **Hex keys**: `"col,row"` strings (e.g. `"3,-1"`), used as both the hex ID and the localStorage map key
- **Neighbour directions**: odd-q flat-top; even and odd columns use different offset sets to handle the zigzag correctly (`col % 2 !== 0` handles negative columns correctly vs. `=== 1`)
