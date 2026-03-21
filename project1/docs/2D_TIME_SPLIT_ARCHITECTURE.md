# 2D Time-Split Puzzle Platformer — Architecture Plan

**Inspired by:** Braid  
**Tech:** HTML5 Canvas + vanilla JavaScript (browser), single-player, 2D  
**Target:** Intermediate; build in phases so Cursor can help at each step.

---

## 1. Tech Stack

| Layer        | Choice              | Notes                          |
|-------------|---------------------|---------------------------------|
| Runtime     | Browser              | No install; easy to share       |
| Rendering   | Canvas 2D            | You already use it (survival)   |
| Language    | JavaScript (ES5-ish) | Or TypeScript if you prefer     |
| Structure   | Single HTML + JS/CSS | Or split into modules later     |
| Physics     | Custom (AABB, tiles) | No engine; full control for time|

**Why not Phaser/Godot here:** Time manipulation (rewind, recording) is easier when you own the game loop and state; a custom loop keeps “ticks” and “replay buffers” explicit.

---

## 2. Core Pillars (What Makes It Complex)

1. **Action recording** — Store (time, entityId, action) so “past selves” can be replayed.
2. **Rewind** — Run simulation backward from a snapshot or from recorded events.
3. **Timeline collision** — “Past you” and “current you” (and moving platforms) must not overlap in invalid ways; define rules (e.g. past is ghost vs solid).
4. **Persistent world memory** — Some objects (e.g. keys, doors) stay changed when you rewind; others (enemies, crates) reset. Need a clear “what is timeline-sensitive” model.

---

## 3. Phase Overview

| Phase | Goal | Main deliverable |
|-------|------|-------------------|
| **0** | Run loop + level | Canvas, tile grid, 60 FPS, one test level (JSON or array). |
| **1** | Player & platformer feel | Move, jump, gravity, AABB vs tiles, one-way platforms optional. |
| **2** | Recording | Record player inputs (or state snapshots) per tick; no rewind yet. |
| **3** | Replay “past self” | Playback recording as a second character (ghost) in the same level. |
| **4** | Rewind | Rewind time (reverse playback or rollback state); limit rewind length (e.g. 10 s). |
| **5** | Timeline rules | Define: past self solid vs ghost; which objects rewind, which don’t. |
| **6** | Puzzles & levels | Keys, doors, crates, buttons; 2–3 levels that use rewind + past self. |
| **7** | Polish | Death/reset, HUD, simple sound, level select. |

---

## 4. Step-by-Step Implementation Order

### Phase 0 — Foundation

1. **New folder** e.g. `timesplit/` with `index.html`, `css/style.css`, `js/game.js`.
2. **Canvas** fixed size (e.g. 640×360 or 800×450), clear and scale to fit (CSS + optional devicePixelRatio).
3. **Game loop** `requestAnimationFrame`, delta time, cap at 60 FPS (or fixed 50 ms step for deterministic replay later).
4. **Tile grid** 2D array for level (0 = air, 1 = solid, 2 = one-way, etc.). Draw tiles; no player yet.
5. **One test level** e.g. 50×20 tiles, platform layout in code or JSON; load and render.

**Cursor prompt example:**  
*“Create a 2D canvas game loop at 60 FPS and a tile-based level from a 2D array; draw the tiles with a simple fill style.”*

---

### Phase 1 — Platformer

1. **Player** rectangle (AABB), position `x,y`, velocity `vx,vy`, gravity, jump force.
2. **Input** keyboard (arrows/WASD + space/W for jump); store “current frame input” (left/right/jump).
3. **Collision** AABB vs tile grid (floor, ceiling, walls); resolve sliding, set “on ground” flag for jump.
4. **Camera** follow player (clamped to level bounds); draw world in world coordinates, then apply camera offset.
5. **One-way platforms** (optional) only collide when moving down; skip when jumping up.

**Cursor prompt example:**  
*“Add a player with gravity and jump; AABB collision against the tile grid and camera that follows the player.”*

---

### Phase 2 — Recording

1. **Tick counter** `tick = 0` incremented each fixed update (e.g. every 50 ms); all replay uses ticks.
2. **Input log** array of `{ tick, left, right, jump }` (or a single array of inputs indexed by tick).
3. **Record mode** while playing, each tick append current input to the log; cap length (e.g. 600 ticks = 30 s).
4. **No rewind yet** — just verify log is filled when you play; optional debug draw of “log length” on screen.

**Cursor prompt example:**  
*“Record player input every game tick into an array (tick, left, right, jump) and limit the buffer to the last N ticks.”*

---

### Phase 3 — Replay as “Past Self”

1. **Replay entity** a second character (e.g. different color) that doesn’t accept keyboard input.
2. **Replay from log** given a “start tick” and “current tick”, compute replay position by re-running inputs from start tick to current tick (or from 0 to current − rewind amount).
3. **Draw past self** at the replayed position every frame; keep main player and past self on same camera.
4. **Clarify rule** for now: past self is “ghost” (no collision with current player) or solid (you can stand on your past self) — pick one and document it.

**Cursor prompt example:**  
*“Add a second character that replays the last 5 seconds of recorded input and draw it as a ghost; no collision with the main player.”*

---

### Phase 4 — Rewind

1. **Rewind input** e.g. hold R or press R to rewind; while rewinding, don’t record new input.
2. **State snapshots (simple)** every K ticks (e.g. 10), store `{ tick, playerX, playerY, playerVx, playerVy }`; on rewind, find nearest snapshot before target tick and replay from there to target. *Or* reverse the input log and simulate backward (harder).
3. **Snapshot-based rewind** when user presses rewind, set “target tick” to current − 300 (e.g.); each frame move “current tick” toward “target tick” and recompute player position from snapshot + replay; when reached, resume normal play and truncate input log to target tick.
4. **World state** for Phase 4, only player rewinds; level (doors, crates) stays as-is. (Phase 5 will add “objects that rewind”.)

**Cursor prompt example:**  
*“Implement rewind: store player position every N ticks; when the user holds R, rewind time by replaying from an earlier snapshot and truncate the input log.”*

---

### Phase 5 — Timeline Rules

1. **Tag objects** “timeline_sensitive” (resets on rewind) vs “persistent” (stays). Example: crates = timeline_sensitive, key/door state = persistent (or the opposite for puzzle design).
2. **Snapshot more state** include crate positions, door open/closed, etc., in each snapshot so rewind restores them for timeline_sensitive objects.
3. **Past self vs current** implement rule: e.g. past self is ghost (no interaction) or solid (can push/stand). Document in code and in a short design note.
4. **Paradox prevention (optional)** if past self and current self occupy same AABB, either forbid rewind that would cause that or push one of them.

---

### Phase 6 — Puzzles & Levels

1. **Doors and keys** key is timeline_sensitive; door stays open once opened (persistent) — so rewind doesn’t “un-open” it; or make both rewind for different puzzle.
2. **Crates** movable, timeline_sensitive; past self can push a crate, you rewind and now the crate is elsewhere for “current” you.
3. **2–3 levels** design levels that require “record a path, rewind, then use the past self to hold a button or block an enemy” etc.
4. **Level format** JSON or array; level list in code; “next level” on trigger (e.g. door or goal tile).

**Cursor prompt example:**  
*“Add crates that can be pushed; include their positions in the rewind snapshot so they rewind with the player.”*

---

### Phase 7 — Polish

1. **Death** out-of-bounds or “enemy touch” resets level or restarts from last snapshot.
2. **HUD** show rewind bar (how much time left you can rewind), current level, optional timer.
3. **Level select** simple menu or “restart level” / “next level” buttons.
4. **Sound (optional)** jump, rewind whoosh, door open; keep assets minimal.

---

## 5. Suggested File Layout

```
timesplit/
  index.html
  css/
    style.css
  js/
    game.js        # loop, canvas, main
    level.js       # tile grid, load level, collision helpers
    player.js      # player state, input, physics
    record.js      # input log, snapshots, replay, rewind
    draw.js        # draw tiles, player, past self, HUD
  levels/
    level1.json    # or level1.js exporting array
    level2.json
```

Start with a single `game.js`; split into the above when it gets long (Cursor is good at refactoring into modules).

---

## 6. Key Data Structures (Reference)

- **Input log:** `inputs[tick] = { left, right, jump }` or `inputs = [{ tick, left, right, jump }, ...]`
- **Snapshots:** `snapshots[i] = { tick, x, y, vx, vy [, cratePositions, ...] }`
- **Level:** `grid[ty][tx] = 0|1|2|...` (0 = air, 1 = solid, 2 = one-way, 3 = door, 4 = key, etc.)

---

## 7. What to Defer

- **Multiplayer** — single-player only.
- **Procedural levels** — hand-crafted levels first; procedural can come later.
- **Complex graphics** — solid colors and simple shapes first; art pass later.
- **Full “multiple parallel timelines”** — start with one past self + rewind; Braid-style multiple branches can be a later expansion.

---

## 8. Cursor Workflow Tips

- Implement **one phase at a time**; get it running before starting the next.
- Use **clear prompts**: “Add a rewind bar that shows remaining rewind time (max 10 seconds) and decreases while rewinding.”
- **Refactor when messy:** “Split game.js into level.js, player.js, and record.js; keep the same behavior.”
- **Debug with logs:** “Log snapshot tick and replay start tick when rewind is triggered.”

---

You can start with **Phase 0** in a new `timesplit/` folder and paste the Phase 0 prompt into Cursor to generate the initial loop and tile renderer. If you tell me your preferred canvas size and tile size, I can adapt the plan (e.g. 32×32 tiles, 20×15 tiles per screen).
