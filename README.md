# Kill Team: Ctesiphus Expedition — Campaign Tracker

A browser-based campaign management tool for the **Kill Team (2024)** Ctesiphus Expedition campaign. No server, no build tools, no dependencies — open `index.html` and play.

---

## Features

### Map Tab
- **Freeform hex placement** — click ghost indicators (dashed blue hexes) to place new hexes edge-to-edge, building any shape of map
- **Flat-top hexes** with odd-q offset geometry; numbered and named per hex
- **Hex types**: Surface, Tomb, Blocked — painted individually or via brush mode
- **Setup mode** — paint-bucket style: enable Setup, choose a brush, click any placed hex to repaint it
- **Pre-configured Maps** — load a predefined layout from the dropdown; currently includes *Ctesiphus Expedition – Map 1* (26 hexes)
- **Auto-generate** — procedurally generate a map in centralised or chunked style, with configurable depth/cluster settings
- **Explore animation** — clicking "Explore Hex" triggers a slot-machine reveal that rolls through location and condition entries before locking in the result
- **Hex detail panel** — select any hex to edit its number, name, type, explore results, reserves, beast/prisoner flags, and freeform notes
- **Kill-team flags** — mark which hexes are bases or camp sites for each kill team
- **Zoom controls** — zoom in/out or fit the entire map to the available space
- **Clear Map** — wipe all hexes with a confirmation prompt

### Kill Teams Tab
- Add up to any number of kill teams
- Select the team type from all 24 official Kill Team (2024) factions
- Track operatives with name, type, status (Active / Injured / Casualty), XP, and injuries
- Colour-coded status indicators and summary pip track at a glance
- Objective tracker per team
- Freeform notes per team

### Campaign Log Tab
- Timestamped log entries (manual)
- Round and phase tracking displayed in the header

### Generator Tab
- Standalone D36 roller for Surface Location, Surface Condition, Tomb Location, and Tomb Condition tables
- Respects already-explored codes (avoids duplicates where the rules require it)

### Settings Tab
- Rename the campaign
- Toggle Solo / Multiplayer mode
- Adjust threat level and reset campaign state

---

## Getting Started

1. Clone or download this repository
2. Open `index.html` in any modern browser (Chrome, Firefox, Safari, Edge)
3. No installation, no build step required

```
killteam24-campaign-map/
├── index.html          # Entry point
├── favicon.svg         # Crossed-swords hex icon
├── css/
│   └── style.css       # Dark Necron theme, all styles
├── js/
│   ├── app.js          # State management, tab routing, Kill Teams / Log / Settings UIs
│   ├── data.js         # D36 roll tables (locations, conditions, rules text)
│   ├── generator.js    # Dice functions, Generator tab UI
│   └── hexmap.js       # SVG hex map, placement, explore mechanics, pre-configured maps
└── source/
    └── ctesiphus_expedition_campaign_map_1.json   # Exported Map 1 layout (26 hexes)
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

## Kill Team Factions Supported

Angels of Death · Battleclade · Blades of Khaine · Brood Brothers · Canoptek Circle · Celestian Insidiants · Chaos Cult · Deathwatch · Goremongers · Hernkyn Yaegirs · Mandrakes · Murderwing · Nemesis Claw · Plague Marines · Ratlings · Raveners · Sanctifiers · Scout Squad · Spectre Squad · Tempestus Aquilons · Vespid Stingwings · Wolf Scouts · Wrecka Krew · XV26 Stealth Battlesuits

---

## Technical Notes

- **Pure vanilla JS/HTML/CSS** — no frameworks, no npm, no build tooling
- **Hex geometry**: flat-top hexes, odd-q column offset. Centre formula: `cx = 1.5 × size × col`, `cy = √3 × size × row + (odd col ? √3/2 × size : 0)`
- **Hex keys**: `"col,row"` strings (e.g. `"3,-1"`), used as both the hex ID and the localStorage map key
- **Neighbour directions**: odd-q flat-top; even and odd columns use different offset sets to handle the zigzag correctly (JS modulo is sign-preserving, so `col % 2 !== 0` is used rather than `=== 1` to handle negative columns)
