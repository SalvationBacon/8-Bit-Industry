# Zone 3 — The Deep · Design Draft

> **Status:** DRAFT for review. Nothing here is implemented yet.
> **Sources:** GDD §3 (zone theme, resources, pressure mechanic, rocket fuel), GDD §8 (Zone 3 power), GDD §18 (fluid/pipe system).
> Numbers are starting points for tuning, not final.
> Decisions needed before coding are collected in **§12 Open Questions**.

---

## 1. Pitch

**Theme (GDD):** underground cave network. No sky. Pressure systems, glowing minerals.
**Mood:** Zone 1 was about building something. Zone 2 was about surviving what you built. Zone 3 is about **control**: everything runs on fluid under pressure, and pressure that gets away from you blows up.

**New in this zone**
1. **Fluids and pipes.** These are the first fluids in the game, and Zone 4 (enzymes) reuses the system.
2. **Pressure.** Each pipe network has a pressure gauge. Too low and fluid machines stop. Too high for too long and a pipe bursts.
3. **Light-cycle power.** Lumen Panels feed on the caves' pulsing glow, and Accumulators store power for the dim phases.

---

## 2. Story Beats

**Zone 2 launch** (replaces "Zone 3 coming soon..."):
> The rocket screams upward. The Nav Computer locks onto a signal — not from the sky, but from *below*.
> The ground opens. You fall into the dark.

**Arrival modal: 🕳️ THE DEEP**
> The signal led down. Way down.
> The rocket is wedged in a cavern. The walls glow. The air hums.
> *Pump the brine. Grow the crystals. Drill your way out.*

As in Zone 2, research and perks carry over and everything else resets. Quick Start applies.

---

## 3. Resources

| Resource | ID | Type | Source | Notes |
|---|---|---|---|---|
| Quartz Crystal | `quartz` | Ore | Miner on quartz deposits | Main Zone 3 ore |
| Rare Earth Ore | `rare_earth` | Ore | Miner on rare-earth deposits | |
| Lithium Brine | `brine` | **Fluid** | Brine Pump on brine pools | Only moves through pipes |
| Radiant Dust | `radiant_dust` | Ore | Miner on radiant vents, **half speed** | Scarce, glows on the map |
| Iron / Copper / Coal / Stone | — | Ore | Small patches | Bootstrapping only. Coal is scarce, which pushes players toward Lumen Panels |

**Map (`buildMapZ3()`):** 96×64, same `place()` approach as Zone 2.
- Deposits: quartz ×4, rare earth ×3, brine pools ×3, radiant vents ×2 (small), iron ×2, copper ×2, coal ×2 (small), stone ×2.
- **Optional (Q2):** non-buildable **cave-wall tiles** carve the map into caverns joined by narrow passages. Pipes, belts and tunnels then have to route through the gaps. This is the biggest "feels like a cave" win, but it adds a tile type and changes placement rules.

---

## 4. Fluid & Pressure System (core, reusable)

The system is network-based rather than tile-by-tile. That keeps it cheap on mobile and easy to show on one gauge.

### Pipes and networks
- A **Pipe** (1×1) connects automatically to adjacent pipes and to any fluid machine it touches. Pipes have no direction.
- Connected pipes plus the fluid machines they touch form a **network**. Networks are rebuilt by flood-fill only when a pipe or fluid machine is placed, removed or moved, not every tick.
- Each network holds **one fluid**. Placing a pipe that would join two different fluids is refused with "Fluids would mix".
- **Capacity:** pipe 10 units, Fluid Tank 200 units. Machines with fluid ports add nothing.
- **Persistence:** each pipe or tank stores its share as `m.fluid = {type, amt}`. When networks are rebuilt, the total is shared out by capacity. Saves stay machine-based, so no new top-level save structure is needed.

### Pressure
```
pressure = network amount / network capacity × 100   (0–100%)
```
| Band | Effect |
|---|---|
| **< 20%** | **Under-pressure.** Fluid consumers can't draw, and their status shows LOW PRESSURE (like NO POWER). |
| 20–90% | Normal. |
| **≥ 60%** | Required by the **Rod Press**, a high-pressure machine. This creates a 60–90% operating window. |
| **≥ 90%** | **Over-pressure.** The network's strain rises by 1 per tick. Below 90%, strain falls by 2 per tick. |
| **Strain 80** (~20s at ≥ 90%) | **Pipe burst.** One pipe in the network is destroyed, the network loses 50% of its fluid, with a burst animation, an SFX and a "PIPE BURST" toast. |

- Pumps **keep pushing** when the network is full: the amount stops at capacity but strain keeps rising. A pump with nowhere to send its brine will eventually burst a pipe. That's the core tension: balance pumps against consumers, or add tanks and relief valves.
- A burst only costs a pipe and some fluid. That follows the GDD's "fix it without bricking the factory" philosophy (see Q1).

### Fluid machines
| ID | Name | Size | Power | Behaviour |
|---|---|---|---|---|
| `pipe` | Pipe | 1×1 | 0 | Network segment, 10 capacity |
| `brine_pump` | Brine Pump | 2×2 | 8 | On a brine pool: adds 1 unit every 2 ticks (2/s) to an adjacent network |
| `fluid_tank` | Fluid Tank | 2×2 | 0 | +200 capacity |
| `relief_valve` | Relief Valve | 1×1 | 0 | When pressure > 80%, vents 3 units/s (fluid is lost) |

Recipes with fluid inputs list them under `fluid:{brine:N}` next to `in:{...}`. The machine draws from any network it touches when the recipe starts, so fluid never goes in `inBuf`.

### UI
- **HUD gauge:** 💧 shows the highest-pressure network, and turns amber at 90% and red while strain is rising.
- **Inspecting any pipe, tank or valve** shows its network's fluid, amount/capacity, a pressure bar with the 20/60/90 marks, strain, and the pumps and consumers attached.
- **Pipe sprite:** auto-tiles to its neighbours and is tinted by fluid (brine is pale cyan). Its fill level shows as a brighter core line.

---

## 5. Production Chains

```
Quartz ──(Elec. Smelter)──► Silicon ─────────────┐
                                                 ├─(Assembler)──► Lattice Core ─┐
Rare Earth + Brine ─(Separator)─► RE Oxide ─(Asm)─► Magnet ──┘                  │
                                                                                ├─(Rod Press, ≥60% P)─► Lattice Fuel Rod
Radiant Dust ───────────────────────────────────────────────────────────────────┤
Brine ──────────────────────────────────────────────────────────────────────────┘
Brine ─(Evaporator)─► Lithium Salt ─(Elec. Smelter)─► Lithium ─(Asm)─► Battery
```

### New machines (production and power)
| ID | Name | Size | Power | Unlock | Notes |
|---|---|---|---|---|---|
| `evaporator` | Evaporator | 2×2 | 14 | fluid_handling | Brine → lithium salt |
| `separator` | Separator | 2×2 | 16 | pressure_control | Rare earth + brine → RE oxide |
| `rod_press` | Rod Press | 2×2 | 24 | lattice_fuel | **Needs ≥ 60% pressure** |
| `lumen_panel` | Lumen Panel | 2×2 | −40 / 0 | crystal_refining | Glow-tide power (§7) |
| `accumulator` | Accumulator | 1×1 | 0 | energy_storage | Stores power (§7) |

### New items
`quartz` 💎 · `rare_earth` 🟤 · `radiant_dust` ✨ · `silicon` 🔷 · `lithium_salt` 🧂 · `lithium` 🔋 (or ⚪) · `re_oxide` 🟠 · `magnet` 🧲 · `battery` 🔋 · `lattice_core` 💠 · `fuel_rod` 🟩 · science `sci_deep` 📔, `sci_pressure` 📈, `sci_lattice` 📗 · rocket parts (`cat:'rocket3'`) below.

### Recipes
| ID | Machine | Time | In | Fluid | Out | Unlock |
|---|---|---|---|---|---|---|
| `z3_silicon` | Elec. Smelter | 6s | 2 quartz | — | 1 silicon | crystal_refining |
| `z3_evap` | Evaporator | 8s | — | 20 brine | 1 lithium salt | fluid_handling |
| `z3_lithium` | Elec. Smelter | 8s | 1 lithium salt | — | 1 lithium | energy_storage |
| `z3_separate` | Separator | 10s | 2 rare earth | 10 brine | 1 RE oxide | pressure_control |
| `z3_magnet` | Assembler | 8s | 1 RE oxide + 2 iron plate | — | 1 magnet | pressure_control |
| `z3_battery` | Assembler | 10s | 2 lithium + 1 copper plate + 1 steel | — | 1 battery | energy_storage |
| `z3_core` | Assembler | 16s | 3 silicon + 1 magnet | — | 1 lattice core | lattice_fuel |
| `z3_rod` | Rod Press | 20s | 1 lattice core + 5 radiant dust | 20 brine | 1 fuel rod | lattice_fuel |
| `z3_sci_deep` | Lab | 8s | 1 quartz + 2 copper wire | — | Deep Notes | — |
| `z3_sci_press` | Lab | 10s | 1 lithium salt + 1 circuit | — | Pressure Data | fluid_handling |
| `z3_sci_lat` | Lab | 14s | 2 silicon + 1 magnet | — | Lattice Data | pressure_control |

Deep Notes need no fluids, so research can start before the first pipe exists.

---

## 6. Tech Tree (Zone 3)

| Tech | Era | Cost | Requires | Unlocks |
|---|---|---|---|---|
| Fluid Handling | Deep Era 1 | 10 📔 | — | Pipe, Brine Pump, Fluid Tank, Evaporator, Pressure Data |
| Crystal Refining | Deep Era 1 | 15 📔 | — | Silicon, Lumen Panel |
| Pressure Control | Deep Era 2 | 30 📔 + 20 📈 | fluid_handling | Relief Valve, Separator, Magnet, Lattice Data |
| Energy Storage | Deep Era 2 | 30 📔 + 20 📈 | fluid_handling + crystal_refining | Lithium, Battery, Accumulator |
| Lattice Fuel | Deep Era 3 | 50 📔 + 40 📈 + 20 📗 | pressure_control + energy_storage | Rod Press, all rocket parts |

That's two parallel Era 1 techs, a step toward the GDD's "wide web" of several valid paths. All techs carry `zone:3`.

---

## 7. Power

**Lumen Panel.** The GDD says *Solar Panel, 40 kW, day only*. Underground there's no sun, so this reinterprets it (Q4):
- The caves have a **glow tide**: 180s bright, then 60s dim, repeating, derived from `G.tick`.
- Lumen Panels give 40 kW when bright and 0 when dim. They use no fuel.
- The HUD shows the tide phase and a countdown.

**Accumulator** (Q3):
- Holds 2,000 kJ (40 kW for 50s).
- Charges from surplus power and discharges during a deficit.
- `gameTick` already totals demand in a pre-pass, so after pass 1 accumulators cover `max(0, demand − out)` while they have charge.
- The hard power cutoff stays. Accumulators are how you avoid it during dim phases.
- This changes the power model, so it needs sign-off.

Coal Burners and Generators still work but coal is scarce. Combustion Generators have no fuel here, since there's no oil.

---

## 8. Rocket — Escape Shaft

You drill up through the cave roof. Launch needs Rocket parts `ROCKET_PARTS_Z3`, all made in the Assembler except the fuel rods:

| Part | Need | Recipe |
|---|---|---|
| Lattice Fuel Rod 🟩 | 4 | Rod Press (above) |
| Pressure Hull 🛡️ | 2 | 6 steel + 2 RE oxide |
| Battery Bank 🔋 | 2 | 4 battery + 2 circuit |
| Guidance Crystal 💠 | 1 | 2 lattice core + 4 circuit |
| Shaft Drill ⛏️ | 1 | 8 steel + 4 magnet + 2 engine |

Every chain is required, matching the GDD rule that the rocket needs every chain.

---

## 9. Tutorial, Milestones, Achievements

**Mini-tutorial (`Z3_TUTORIAL`, 3 steps, like Zone 2):**
1. "Research 💧 Fluid Handling with Deep Notes."
2. "Place a Brine Pump on a brine pool and connect a Pipe."
3. "⚠️ Watch the 💧 pressure gauge. Add a Fluid Tank so your pipes don't burst."

**Launch milestones (+1 ⭐ each):**
- **Industrialist:** 25+ production machines
- **Steady Hands:** no pipe bursts this zone. Needs `G.stats.bursts`.
- **Night Shift:** 2+ Accumulators placed

**Achievements (+4):** First Pipe · Kaboom (first burst) · Crystal Fuel (first fuel rod) · Deep Escape (Zone 3 launch)

**Perk points:** add `3:3` to `LAUNCH_PERK_POINTS`. New perks for later zones are their own task, since the GDD says more perks unlock after each launch.

---

## 10. Build Phases

| Phase | Deliverable | Rough size |
|---|---|---|
| **A. Fluid core** | Pipe, network rebuild, fluid storage on machines, pump, tank, valve, pressure bands, strain and burst, HUD gauge, pipe sprite, inspector, save/load. Testable with dev helpers before Zone 3 exists. | ~400 lines |
| **B. Zone 3 world** | Items, recipes (with `fluid:`), machines, techs, `buildMapZ3()`, the Z2 → Z3 transition, Z3 tutorial, rocket panel and launch, Z3 zone tab, drawer category "Deep". | ~450 lines |
| **C. Power** | Glow tide, Lumen Panel, Accumulator. | ~120 lines |
| **D. Polish** | Sprites, SFX (burst, hiss), achievements, milestones, `devCompleteZ3()`, CLAUDE.md update. | ~150 lines |

**Existing logic that would change (flagged under "always ask before changing existing logic"):**
- `transitionToZone2()` becomes a generic `transitionToZone(n)`, sharing the keep-list (research, perks, audio, devMode) and Quick Start.
- `runMachine` recipe start checks `rec.fluid` and pressure in addition to `canFill`.
- The `gameTick` power pass gets accumulator discharge (Phase C only).
- `canPlace` respects cave walls (only if Q2 is yes).
- `launchRocketZ2()` hands off to Zone 3 instead of "coming soon".

---

## 11. Balance Notes

- One Brine Pump (2/s) feeds about one Evaporator (20 per 8s = 2.5/s) at ~80% duty. Players learn quickly that pumps and consumers must match.
- A lone pump on 10 pipes (100 capacity) reaches 90% in ~45s and bursts ~20s later. That's harsh enough to teach and slow enough to react to.
- A Fluid Tank (+200) buys ~100s of headroom per pump.
- The Rod Press's 60% floor means a Relief Valve set at 80% (fixed) leaves a usable 60–80% band.

---

## 12. Open Questions

1. **Burst severity:** destroy only the pipe (current draft), or also damage adjacent machines?
2. **Cave walls:** add non-buildable wall tiles and caverns? This adds the most atmosphere and the most work.
3. **Accumulators:** OK to add power storage to the power model, or keep Zone 3 power as Lumen Panels plus scarce coal?
4. **Lumen Panel:** is the glow-tide take on the GDD's "solar, day only" OK?
5. **Zone 2 oil:** move crude oil onto pipes later for consistency, or leave Zone 2 as it is?
6. **Relief Valve:** fixed 80% threshold, or a tap-to-cycle setting (60/70/80/90)?
7. **Zone switching:** zones stay one-way, as now? The GDD mentions a zone switcher but nothing uses it yet.
