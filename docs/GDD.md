> **Status:** original Game Design Document (v1.0, written when `index.html` was ~2,200 lines).
> It is the source for the long-term vision: zone themes, Zone 3–5 content, prestige, fluids and heat.
> Many Zone 1 specifics have since changed. Where this document disagrees with the code or `CLAUDE.md`,
> **the code and `CLAUDE.md` win.** Known divergences are listed in `CLAUDE.md` under *GDD divergences*.

**8-BIT INDUSTRY**

Game Design Document

Version 1.0 \| Zone 1: Ironfield

***START WITH NOTHING · AUTOMATE EVERYTHING · LAUNCH***

# **1. Vision Statement**

A factory automation game where every run starts with your bare hands and ends with a rocket. Four zones, each a fresh start with a unique resource palette and escalating complexity. After all four zones: a fifth — infinite, combined, brutal — where you build a Singularity and trigger the Big Bang.

**One sentence:** *Start with nothing. Automate everything. Launch a rocket. Repeat — until you break the universe.*

# **2. Core Loop (Per Zone)**

- Hand-collect resources by tapping resource tiles

- Hand-craft basic machines in the Craft panel

- Place first Miner → first automated income

- Research automation → belt systems unlock

- Build production chains (2→3→4→5 steps deep)

- Research deeper tech → new machines, new chains

- Manage power grid, heat, and logistics bottlenecks

- Build all rocket components (requires every chain)

- Launch rocket → zone complete → perk points awarded

- Next zone: new theme, new resources, same loop

Each zone runs this loop in full. Roughly 3–6 hours on first playthrough, 1–2 hours by Zone 4 with perks banked.

# **3. The Five Zones**

## **Zone 1 — Ironfield (MVP)**

**Theme:** Grimy starter planet. Open plains, rust-coloured earth, coal smoke

**Resources:** Iron ore, copper ore, coal, stone

**Unique mechanic:** None — this is the tutorial zone. Clean and learnable

**Rocket fuel:** Coal-derived rocket propellant

**Mood:** You're building something from nothing

## **Zone 2 — The Scar**

**Theme:** Industrial wasteland. Ancient mega-factory ruins, oil seeps, permanent smog

**Resources:** Crude oil, natural gas, sulfur, scrap metal, iron (scarcer)

**Unique mechanic:** Smog accumulation debuffs machine efficiency. Scrubbers required

**Rocket fuel:** Refined petroleum + liquid oxygen

## **Zone 3 — The Deep**

**Theme:** Underground cave network. No sky. Pressure systems, glowing minerals

**Resources:** Quartz crystals, rare earth ore, lithium brine (fluid), radiant dust

**Unique mechanic:** Pressure — over-pressure causes explosions, under-pressure kills fluid flow

**Rocket fuel:** Crystal-lattice solid fuel rods

## **Zone 4 — The Bloom**

**Theme:** Bioluminescent deep-sea floor meets alien jungle

**Resources:** Biomass, spores, enzymes (fluid), algae, luminite ore

**Unique mechanic:** Living machines — biological machines grow and decay over time

**Rocket fuel:** Bio-synthesised hyperfuel

## **Zone 5 — The Singularity (Endgame)**

**Theme:** All four zones merged into one infinite procedurally-expanding factory

**Goal:** Build the Singularity — a 10×10 structure requiring components from all chains

**Win condition:** Sustain the Singularity at full power for 60 seconds → Big Bang

**Mood:** You're not building a factory anymore. You're building a god

# **4. The Manual Phase**

Every zone begins with zero machines, zero automation, zero power. This is intentional — the grind motivates the player to escape it.

## **Hand Collection**

Tap any resource tile with the Mine tool to collect 1 item. No stamina limit — just slow. The tap-to-collect grind is the core early tension.

## **Hand Crafting**

The Craft panel has two sections:

- RECIPES — click-to-craft raw materials into intermediate items (plates, gears, wire)

- BUILD MACHINES — spend materials to queue a machine for placement

## **Early Sequence (target: first 10–15 minutes)**

- Tap iron ore tiles to collect ~20 iron ore by hand

- Open Craft panel → smelt Iron Plates (5 clicks each)

- Build a Stone Furnace (8 stone) → place on grid

- Set furnace recipe → first automated smelting

- Build a Generator (8 iron plate + 4 iron gear) → power comes online

- Build a Miner (5 iron plate + 2 iron gear) → first automated mining

- Open Research → spend Red Science → unlock Basic Automation

- Unlock Smelter + Assembler + Lab → never hand-craft again

# **5. Production Chains — Zone 1**

## **Iron Chain (5 deep)**

Iron ore → Iron plate → Iron gear → Engine block → Rocket chassis

## **Copper Chain (5 deep)**

Copper ore → Copper plate → Copper wire → Circuit board → Flight computer

## **Steel Chain (4 deep)**

Iron plate (×5) → Steel plate → Steel beam → Structural frame

## **Science Chain**

Iron gear + Copper wire → Red science pack

Circuit board + Iron rod → Green science pack

## **Rocket Components (requires all chains)**

| **Component**   | **Recipe**                     | **Machine** |
|-----------------|--------------------------------|-------------|
| Rocket Chassis  | 10× Steel plate + 5× Iron gear | Assembler   |
| Flight Computer | 8× Circuit + 4× Copper wire    | Assembler   |
| Struct. Frame   | 8× Steel plate + 6× Iron rod   | Assembler   |
| Coal Propellant | 10× Coal + 5× Stone            | Smelter     |

# **6. Machine Roster**

| **Machine**   | **Size** | **Power** | **Unlock** | **Description**                    |
|---------------|----------|-----------|------------|------------------------------------|
| Miner         | 1×1      | 3 kW      | Free       | Extracts resources from deposits   |
| Stone Furnace | 1×1      | 0 kW      | Free       | Slow smelter — no power needed     |
| Smelter       | 2×2      | 8 kW      | Automation | Fast smelter — needs power         |
| Assembler     | 2×2      | 12 kW     | Automation | Crafts components from parts       |
| Research Lab  | 2×2      | 6 kW      | Automation | Produces science packs             |
| Generator     | 2×2      | -60 kW    | Free       | Burns coal, generates 60kW         |
| Belt          | 1×1      | 0 kW      | Free       | Moves items in one direction       |
| Inserter      | 1×1      | 1 kW      | Free       | Transfers items to/from machines   |
| Chest         | 1×1      | 0 kW      | Free       | Stores up to 200 items             |
| Rail (stub)   | 2×1      | 0 kW      | Logistics  | \[Future\] Connects to other zones |

## **Machine Build Costs**

| **Machine**   | **Materials required**                     |
|---------------|--------------------------------------------|
| Miner         | 5× Iron plate + 2× Iron gear               |
| Stone Furnace | 8× Stone                                   |
| Smelter       | 8× Iron plate + 4× Iron gear               |
| Assembler     | 12× Iron plate + 6× Iron gear + 2× Circuit |
| Research Lab  | 15× Iron plate + 5× Circuit                |
| Generator     | 8× Iron plate + 4× Iron gear               |
| Belt          | 1× Iron plate each                         |
| Inserter      | 2× Iron plate + 1× Iron gear               |
| Chest         | 4× Iron plate                              |

# **7. Logistics Systems**

## **Belts**

- Directional — each tile has one facing direction

- Items animate along the belt surface as pixel-art dots

- Items at a dead-end stay in the machine's output buffer

- Back-pressure: belt won't accept items if it's full (4 items/tile max)

- Speed bonus: +50% throughput with Advanced Logistics research

## **Inserters**

- Grab from: belt items, chest inventory, or machine output buffer

- Deposit to: belt, chest, or machine input buffer

- Fire every 4 ticks (1/sec at base speed)

- Direction matters — use Rotate tool to set facing

## **Chests**

- Stores up to 200 items

- Input on top, output on bottom (conventional)

- Inserters load and unload chests automatically

## **Machine Buffers**

- Output buffer: holds up to 50 items — machine stalls when full

- Input buffer: pre-loaded via inserters from belts/chests

- Both buffers visible in the machine inspector

- Empty Output button: collects output buffer to global inventory

- Return Inputs button: ejects input buffer back to inventory

# **8. Power Grid**

All machines consume power in kW. Coal Generators produce 60kW each and consume 1 coal every 4 seconds.

## **Power Failure Behaviour**

No hard cutoff. If consumption exceeds production, all machines slow proportionally. At 50% power: machines run at 50% speed. Encourages the player to fix it without bricking the factory.

| **Generator**   | **Output** | **Fuel**        | **Era** |
|-----------------|------------|-----------------|---------|
| Coal Generator  | 60 kW      | Coal (1/4s)     | Zone 1  |
| Oil Generator   | 200 kW     | Petroleum       | Zone 2  |
| Solar Panel     | 40 kW      | None (day only) | Zone 3  |
| Nuclear Reactor | 2,000 kW   | Uranium rods    | Zone 4  |

# **9. Tech Tree**

~60 nodes across 4 eras. Wide web — at least 3 valid paths to the rocket each zone. No single mandatory bottleneck.

| **Tech**           | **Era** | **Cost**           | **Requires**        | **Unlocks**             |
|--------------------|---------|--------------------|---------------------|-------------------------|
| Basic Automation   | Era 1   | 5× Red science     | None                | Smelter, Assembler, Lab |
| Advanced Logistics | Era 1   | 10× Red, 5× Green  | Automation          | Rails, +50% belt speed  |
| Steel Processing   | Era 2   | 15× Red, 10× Green | Automation          | Steel recipes           |
| Electronics        | Era 2   | 20× Red, 15× Green | Automation          | Advanced circuits       |
| Rocket Science     | Era 3   | 25× Red, 25× Green | Steel + Electronics | All rocket recipes      |

# **10. Hand Crafting Recipes**

Click-to-craft converts raw materials into intermediate items. Complexity scales with the number of clicks required.

| **Recipe**   | **Inputs**      | **Outputs**     | **Clicks** |
|--------------|-----------------|-----------------|------------|
| Iron Plate   | 2× Iron ore     | 1× Iron plate   | 5          |
| Copper Plate | 2× Copper ore   | 1× Copper plate | 5          |
| Iron Gear    | 2× Iron plate   | 1× Iron gear    | 10         |
| Copper Wire  | 1× Copper plate | 2× Copper wire  | 8          |
| Iron Rod     | 1× Iron plate   | 2× Iron rod     | 8          |
| Stone Brick  | 2× Stone        | 1× Stone brick  | 3          |

Auto-repeat: when a craft completes, if materials are available for another batch, the session continues automatically. Cancelling refunds the current batch's materials.

# **11. Perk Tree**

Awarded on rocket launch. 3 base points per launch, +1 per milestone completed in that zone. Maximum ~6 points per zone, ~16–20 across all zones.

| **Perk**         | **Category** | **Effect**                                     | **Cost** |
|------------------|--------------|------------------------------------------------|----------|
| Ore Richness I   | Yield        | +10% resource yield per tap and miner          | 1        |
| Ore Richness II  | Yield        | +25% resource yield (stacks)                   | 2        |
| Machine Haste I  | Speed        | +10% all machine processing speed              | 1        |
| Machine Haste II | Speed        | +20% all machine processing speed              | 2        |
| Power Saver I    | Efficiency   | -15% power consumption all machines            | 1        |
| Quick Start      | Utility      | Begin next zone with 50 of each basic resource | 2        |
| Belt Speed I     | Logistics    | +20% belt throughput                           | 1        |

Perks carry into future zones and compound across runs. More perks unlock after each zone launch.

# **12. Rocket System**

The rocket is Zone 1's win condition. It requires components from every production chain — ensuring the player has built a complete factory before escaping.

- All 4 rocket components must be built and present in inventory

- The Rocket panel tracks progress per component with progress bars

- Rocket Science research must be completed first

- Launching awards 3 perk points and opens the perk panel

# **13. UI Layout**

## **HUD (top bar)**

- Zone name + zone switcher tabs (Z1–Z5, locked until unlocked)

- Live resource counts for 7 key items

- Power bar (colour-coded: red/amber/green)

- Panel buttons: Inventory, Research, Rocket, Perks, Menu

## **Toolbar (bottom)**

- Scrollable horizontal categories: Craft \| Tools \| Extract \| Processing \| Logistics \| Future

- Locked items shown greyed with tooltip showing unlock requirement

- Tool tooltip card appears top-left when a machine tool is selected

## **Tool Modes**

| **Tool**         | **Action**                                               |
|------------------|----------------------------------------------------------|
| Select (pointer) | Tap machine to inspect. Tap resource to view description |
| Mine (pickaxe)   | Tap resource tile to collect 1 item by hand              |
| Rotate           | Tap any placed machine to rotate 90° clockwise           |
| Demolish         | Tap any placed machine to remove and refund materials    |
| \[Machine tool\] | Tap grid tile to place the selected machine              |

## **Side Panels**

- Inventory — all items grouped by category, sound toggle

- Craft — click-to-craft recipes + build machine queue

- Research — tech tree, science pack stocks, unlock button

- Rocket — component tracker, recipe reference, launch button

- Machine inspector — status, recipe, progress, buffers, controls

- Perks — zone perks + prestige perks (post-launch)

# **14. Save System**

| **Key**      | **Contents**                                                 |
|--------------|--------------------------------------------------------------|
| ebi_save     | Full game state (map, machines, inventory, research, camera) |
| ebi_prefs    | Settings (sound on/off)                                      |
| ebi_prestige | Prestige currency, permanent perks, cosmetics (never wiped)  |

- Autosaves every 30 seconds

- Also saves on: zone switch, app background, rocket launch

- Single save slot in v1

# **15. Dev Mode**

**Unlock:** Menu → 🔒 DEV → type BIGBANG

**Disable:** Same menu, type BIGBANGOFF

**Persists:** Stored in save file

## **Dev Panel Features**

- Simulation speed: ×1 / ×4 / ×10 / ×20

- Free crafting toggle — hand crafting consumes no materials

- Free building toggle — placing machines costs nothing

- Unlock all techs instantly

- Give resources: 14 individual item buttons + Give All ×500

- Give rocket components + unlock Rocket Science

- Reset save (confirmed via modal)

# **16. Build Order (Coding Sequence)**

| **Phase** | **Deliverable**                                             |
|-----------|-------------------------------------------------------------|
| 1         | Canvas renderer, tile grid, camera pan/zoom, input handling |
| 2         | Resource tiles, tap-to-collect, inventory panel             |
| 3         | Hand crafting panel, stone furnace, click-to-craft          |
| 4         | Machine placement, cost check, tile occupation, preview     |
| 5         | Machine simulation tick loop, recipe processing, buffers    |
| 6         | Power grid, proportional slowdown on deficit                |
| 7         | Belt system, directional belts, item animation              |
| 8         | Inserter logic: belt ↔ machine ↔ chest                      |
| 9         | Tech tree UI + research system                              |
| 10        | Zone switcher stub, perk tree stub, rail stub               |
| 11        | Rocket panel, component tracking, launch sequence           |
| 12        | Perk tree: spend points, apply multipliers                  |
| 13        | Dev mode, sound effects, port arrows, rotate tool           |
| 14        | Polish: pixel art icons, tutorial, PWA manifest + sw.js     |

# **17. Coding Conventions**

- Single index.html — never split into separate files

- Vanilla JS only — no frameworks, no libraries

- node --check on all JS before every delivery

- All state in one central G object, declared once, no duplicates

- Mobile-first: max-width 480px centred, landscape uses sidebar layout

- Bump sw.js cache key (ebi-v1 → ebi-v2) on every deployment

- Always verify index.html starts with \<!DOCTYPE html\>

- Always ask before changing existing logic

- When delivering: provide both index.html and sw.js

# **18. Roadmap**

## **Zone 1 MVP — Complete**

- Tap-to-collect hand mining

- Click-to-craft hand processing

- 9 machine types with full simulation

- Belt + inserter + chest logistics

- Power grid with proportional slowdown

- Tech tree (5 nodes, 4 eras)

- Rocket panel + launch sequence

- Zone switcher stub, perk tree stub, rail stub

- Dev mode with free crafting/building/resources

- Sound effects (Web Audio, 7 types)

- Port arrows with rotation

- Machine output buffer system

## **Near Term**

- Machine tiers (T1–T5 upgrade system)

- Module slots (speed / productivity / efficiency)

- Splitters + belt tunnels

- Blueprint system (save + paste layouts)

- Statistics panel + bottleneck detector

- Achievements (30 milestones)

- Full tutorial sequence

## **Long Term**

- Zone 2 — The Scar (oil, gas, smog mechanic)

- Zone 3 — The Deep (crystals, pressure mechanic)

- Zone 4 — The Bloom (biological machines, decay mechanic)

- Zone 5 — The Singularity (infinite grid, Big Bang endgame)

- Prestige system (Stardust currency, permanent perks, cosmetics)

- Fluid/pipe system

- Heat system

- PWA install + push notifications

# **19. File Structure**

| **File**             | **Purpose**                                                     |
|----------------------|-----------------------------------------------------------------|
| index.html           | Full game (~2,200 lines at current state)                       |
| manifest.json        | PWA — name, icons, standalone, theme \#0d0d0d                   |
| sw.js                | Service worker — network-first HTML, cache-first assets, ebi-v1 |
| icon-192.png         | Android home screen icon                                        |
| icon-512.png         | Splash / store icon                                             |
| apple-touch-icon.png | iOS home screen icon                                            |
| README.md            | GitHub repo readme                                              |

*End of Document — 8-BIT INDUSTRY GDD v1.0*
