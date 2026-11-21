import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BREAKER_BOX_POS,
  CREAKY_FLOORS,
  ENDLESS_CORRIDOR_BOUNDS,
  FLOOR1_GRID,
  FLOOR2_GRID,
  FLOOR2_Y,
  FURNITURE_OBSTACLES,
  GRID_COLS,
  GRID_ROWS,
  HIDE_SPOTS,
  HIDE_TABLES,
  INITIAL_GLASS_SHARDS,
  ITEM_SPAWN_POINTS,
  STEAM_VALVE_POS,
  TILE_SIZE,
} from './mapData';
import {
  assignRandomizedItems,
  buildHudSnapshot,
  createInitialSimulation,
  findNextGridStep,
  GLASSES_ACTIVE_DURATION,
  GLASSES_COOLDOWN_DURATION,
  gridOverrideKey,
  hasLineOfSight,
  isGridCellPassableForAI,
  isStepBlockedByProps,
  isWallCell,
  PLAYER_RADIUS,
  resolveCircleMovement,
  ROOM_INSPECT_DURATION,
  SPRINT_SPEED,
  stepSimulation,
  THREAT_CHASE_SPEED,
  THREAT_PATROL_SPEED,
  THREAT_RADIUS,
  WALK_SPEED,
  type InputSample,
} from './rules';
import { DEFAULT_SETTINGS, loadSettings, saveSettings, sanitizeSettings } from './settings';

const IDLE_INPUT: InputSample = {
  moveForward: 0,
  moveRight: 0,
  sprint: false,
  crouchToggle: false,
  interactPressed: false,
  glassesToggle: false,
  yawDelta: 0,
  pitchDelta: 0,
};

test('2-story 23x23 estate grids are valid, spawns are open, and all wings have hiding spots', () => {
  assert.equal(GRID_ROWS, 23);
  assert.equal(GRID_COLS, 23);
  assert.equal(FLOOR1_GRID.length, GRID_ROWS);
  assert.equal(FLOOR2_GRID.length, GRID_ROWS);
  for (const row of FLOOR1_GRID) assert.equal(row.length, GRID_COLS);
  for (const row of FLOOR2_GRID) assert.equal(row.length, GRID_COLS);

  const sim = createInitialSimulation({ autostart: true });
  const pCol = Math.floor(sim.player.x / TILE_SIZE);
  const pRow = Math.floor(sim.player.z / TILE_SIZE);
  assert.equal(isWallCell(pCol, pRow, 0, sim.shifts.gridOverrides), false);

  const tCol = Math.floor(sim.threat.x / TILE_SIZE);
  const tRow = Math.floor(sim.threat.z / TILE_SIZE);
  assert.equal(isWallCell(tCol, tRow, 1, sim.shifts.gridOverrides), false);

  const initialDist = Math.hypot(sim.player.x - sim.threat.x, sim.player.z - sim.threat.z);
  assert.ok(initialDist > 18, `Expected Resident to spawn far away (>18m), got ${initialDist}m`);

  const coveredZones = new Set(HIDE_SPOTS.map((s) => s.zone));
  for (const z of [
    'pantry',
    'kitchen',
    'boiler',
    'grand_ballroom',
    'library_f1',
    'security',
    'cabin_1',
    'cabin_2',
    'cabin_3',
    'master_bedroom',
  ] as const) {
    assert.ok(coveredZones.has(z), `Missing hiding spot in ${z}`);
  }
});

test('procedural wing generation & randomized spawns remain 100% solvable across 20 seeds', () => {
  for (let seed = 1; seed <= 20; seed++) {
    const sim = createInitialSimulation({
      autostart: true,
      seed: seed * 131 + 7,
      randomizeSpawn: true,
    });
    const dist = Math.hypot(sim.player.x - sim.threat.x, sim.player.z - sim.threat.z);
    assert.ok(dist >= 19.0, `Seed ${seed}: Resident spawned too close (${dist}m)`);

    // Player spawn must reach Exit Door AND Ward Key via 3D BFS
    const wardKey = sim.items.find((i) => i.id === 'ward_key')!;
    const toKey = findNextGridStep(
      sim.player.x,
      sim.player.y,
      sim.player.z,
      wardKey.x,
      wardKey.y,
      wardKey.z,
      sim.doors,
      sim.shifts.gridOverrides
    );
    assert.equal(toKey.reachable, true, `Seed ${seed}: ward_key unreachable from spawn`);

    const toExit = findNextGridStep(
      sim.player.x,
      sim.player.y,
      sim.player.z,
      11.5 * TILE_SIZE,
      0,
      21.5 * TILE_SIZE,
      sim.doors,
      sim.shifts.gridOverrides
    );
    assert.equal(toExit.reachable, true, `Seed ${seed}: exit unreachable from spawn`);
  }
});

test('randomized item spawns always place ward_key in an open zone across 50 seeds', () => {
  const openIds = new Set(ITEM_SPAWN_POINTS.filter((p) => p.tier === 'open').map((p) => p.id));
  for (let seed = 1; seed <= 50; seed++) {
    const items = assignRandomizedItems(seed * 97);
    assert.equal(items.length, 4);
    const spawnIds = new Set(items.map((i) => i.spawnId));
    assert.equal(spawnIds.size, 4);
    const wardKey = items.find((i) => i.id === 'ward_key')!;
    assert.ok(openIds.has(wardKey.spawnId));
  }
});

test('Monster collision & AI grid prevent clipping into solid props, boiler tank, bookshelves, and tables', () => {
  const sim = createInitialSimulation({ autostart: true });
  const kitchenBox = FURNITURE_OBSTACLES.find((o) => o.id === 'kitchen_island_counter')!;
  const boilerTank = FURNITURE_OBSTACLES.find((o) => o.id === 'boiler_tank_box')!;
  const shelf = FURNITURE_OBSTACLES.find((o) => o.id === 'library_shelf_2')!;
  const ballroomTable = HIDE_TABLES.find((t) => t.id === 'table_ballroom_dining')!;

  // AI cost-map & step checks block solid prop footprints (Kitchen, Boiler, Bookshelves, Tables)
  assert.equal(isGridCellPassableForAI(2, 18, 0, sim.doors, sim.shifts.gridOverrides), false);
  assert.equal(isStepBlockedByProps(0, 2, 1, 2, 2), true);
  assert.equal(isStepBlockedByProps(0, 18, 13, 18, 14), true);
  assert.equal(isGridCellPassableForAI(10, 16, 0, sim.doors, sim.shifts.gridOverrides), false);

  // Pushing Threat directly toward props stops outside bounding box + THREAT_RADIUS
  const hitCounter = resolveCircleMovement(
    1.95 * TILE_SIZE,
    0,
    19.0 * TILE_SIZE,
    2.5,
    0,
    THREAT_RADIUS,
    sim.doors,
    true,
    sim.shifts.gridOverrides,
    false
  );
  assert.ok(hitCounter.x <= kitchenBox.minX - THREAT_RADIUS + 0.02);

  const hitBoiler = resolveCircleMovement(
    2.2 * TILE_SIZE,
    0,
    3.0 * TILE_SIZE,
    0,
    -2.5,
    THREAT_RADIUS,
    sim.doors,
    true,
    sim.shifts.gridOverrides,
    false
  );
  assert.ok(hitBoiler.z >= boilerTank.maxZ + THREAT_RADIUS - 0.02);

  const hitShelf = resolveCircleMovement(
    18.5 * TILE_SIZE,
    0,
    13.2 * TILE_SIZE,
    0,
    2.0,
    THREAT_RADIUS,
    sim.doors,
    true,
    sim.shifts.gridOverrides,
    false
  );
  assert.ok(hitShelf.z <= shelf.minZ - THREAT_RADIUS + 0.02);

  const hitTable = resolveCircleMovement(
    10.6 * TILE_SIZE,
    0,
    15.1 * TILE_SIZE,
    0,
    2.0,
    THREAT_RADIUS,
    sim.doors,
    true,
    sim.shifts.gridOverrides,
    false
  );
  assert.ok(hitTable.z <= ballroomTable.minZ - THREAT_RADIUS + 0.02);
});

test('Under-table hiding: crouching player slides underneath, stays hidden from patrol, and cannot stand while trapped', () => {
  const sim = createInitialSimulation({ autostart: true });
  const tbl = HIDE_TABLES.find((t) => t.id === 'table_ballroom_dining')!;
  const centerX = (tbl.minX + tbl.maxX) * 0.5;
  const centerZ = (tbl.minZ + tbl.maxZ) * 0.5;

  // Standing player collides against table edge
  const blocked = resolveCircleMovement(
    centerX,
    0,
    tbl.minZ - 0.45,
    0,
    1.2,
    PLAYER_RADIUS,
    sim.doors,
    true,
    sim.shifts.gridOverrides,
    false
  );
  assert.ok(blocked.z <= tbl.minZ - PLAYER_RADIUS + 0.02);

  // Crouching player walks smoothly beneath table and is flagged isUnderTable = true
  sim.player.x = centerX;
  sim.player.y = 0;
  sim.player.z = tbl.minZ - 0.42;
  sim.player.yaw = Math.PI; // facing South (+Z)
  sim.player.crouching = true;
  for (let i = 0; i < 15; i++) {
    stepSimulation(sim, { ...IDLE_INPUT, moveForward: 1 }, 0.04);
  }
  assert.equal(sim.player.isUnderTable, true);
  assert.equal(sim.player.underTableId, tbl.id);

  // Trying to uncrouch under table keeps player crouched!
  stepSimulation(sim, { ...IDLE_INPUT, crouchToggle: true }, 0.016);
  assert.equal(sim.player.crouching, true);

  // Patrolling Resident standing nearby with open sightline does NOT detect player hidden under table
  sim.threat.mode = 'patrol';
  sim.threat.x = centerX;
  sim.threat.y = 0;
  sim.threat.z = tbl.minZ - 1.2;
  sim.threat.sawUnderTableId = null;
  stepSimulation(sim, IDLE_INPUT, 0.04);
  assert.notEqual(sim.threat.mode, 'chase');
  assert.equal(sim.phase, 'playing');
});

test('player smoothly traverses all 3 estate staircases (Main, West Service, Library)', () => {
  const sim = createInitialSimulation({ autostart: true });
  sim.threat.x = 1.5 * TILE_SIZE;
  sim.threat.y = FLOOR2_Y;
  sim.threat.z = 3.5 * TILE_SIZE;

  // 1. Main Stairs
  sim.player.x = 11.5 * TILE_SIZE;
  sim.player.y = 0;
  sim.player.z = 9.2 * TILE_SIZE;
  sim.player.yaw = 0;
  for (let i = 0; i < 65; i++) {
    stepSimulation(sim, { ...IDLE_INPUT, moveForward: 1 }, 0.04);
  }
  assert.ok(sim.player.y > 3.4, `Expected Floor 2 via Main Stairs, got Y=${sim.player.y}`);

  // 2. West Service Stairs
  sim.player.x = 2.5 * TILE_SIZE;
  sim.player.y = FLOOR2_Y;
  sim.player.z = 12.2 * TILE_SIZE;
  sim.player.yaw = 0;
  for (let i = 0; i < 65; i++) {
    stepSimulation(sim, { ...IDLE_INPUT, moveForward: 1 }, 0.04);
  }
  assert.ok(sim.player.y < 0.15, `Expected Floor 1 via West Service Stairs, got Y=${sim.player.y}`);

  // 3. Library Grand Staircase
  sim.player.x = 21.5 * TILE_SIZE;
  sim.player.y = 0;
  sim.player.z = 15.2 * TILE_SIZE;
  sim.player.yaw = 0;
  for (let i = 0; i < 65; i++) {
    stepSimulation(sim, { ...IDLE_INPUT, moveForward: 1 }, 0.04);
  }
  assert.ok(sim.player.y > 3.4, `Expected Floor 2 via Library Stairs, got Y=${sim.player.y}`);
});

test('Library Floor 2 Mezzanine guardrail stops falling into atrium while preserving open sightlines', () => {
  const sim = createInitialSimulation({ autostart: true });
  const moved = resolveCircleMovement(
    16.5 * TILE_SIZE,
    FLOOR2_Y,
    14.5 * TILE_SIZE,
    2.5,
    0,
    PLAYER_RADIUS,
    sim.doors,
    true,
    sim.shifts.gridOverrides
  );
  assert.ok(moved.x < 17.02 * TILE_SIZE, `Guardrail should block walking into pit, got x=${moved.x}`);

  const eastWalk = resolveCircleMovement(
    20.42 * TILE_SIZE,
    FLOOR2_Y,
    13.5 * TILE_SIZE,
    0,
    1.5,
    PLAYER_RADIUS,
    sim.doors,
    true,
    sim.shifts.gridOverrides
  );
  assert.ok(eastWalk.z > 14.0 * TILE_SIZE, 'Col 20 East Mezzanine walkway should remain unobstructed');

  const losOpen = hasLineOfSight(
    16.5 * TILE_SIZE,
    FLOOR2_Y,
    14.5 * TILE_SIZE,
    20.4 * TILE_SIZE,
    FLOOR2_Y,
    14.5 * TILE_SIZE,
    sim.doors,
    sim.shifts.gridOverrides
  );
  assert.equal(losOpen, true);
});

test('Monster rebalance & 4.0s inspect_room pause in major rooms', () => {
  assert.equal(THREAT_PATROL_SPEED, 1.8);
  assert.ok(WALK_SPEED < THREAT_CHASE_SPEED && THREAT_CHASE_SPEED < SPRINT_SPEED);

  const sim = createInitialSimulation({ autostart: true });
  sim.player.x = 1.5 * TILE_SIZE;
  sim.player.y = FLOOR2_Y;
  sim.player.z = 3.5 * TILE_SIZE;

  sim.threat.mode = 'patrol';
  sim.threat.lastInspectedZone = null;
  sim.threat.x = 11.5 * TILE_SIZE;
  sim.threat.y = 0;
  sim.threat.z = 14.5 * TILE_SIZE;
  sim.threat.targetX = 11.5 * TILE_SIZE;
  sim.threat.targetY = 0;
  sim.threat.targetZ = 12.5 * TILE_SIZE;

  stepSimulation(sim, IDLE_INPUT, 0.04);
  assert.equal(sim.threat.mode, 'inspect_room');
  assert.ok(sim.threat.roomInspectTimer <= ROOM_INSPECT_DURATION && sim.threat.roomInspectTimer > 3.8);

  const xBeforePause = sim.threat.x;
  const zBeforePause = sim.threat.z;
  for (let i = 0; i < 50; i++) {
    stepSimulation(sim, IDLE_INPUT, 0.04);
  }
  assert.equal(sim.threat.mode, 'inspect_room');
  assert.equal(sim.threat.x, xBeforePause);
  assert.equal(sim.threat.z, zBeforePause);

  for (let i = 0; i < 55; i++) {
    stepSimulation(sim, IDLE_INPUT, 0.04);
  }
  assert.equal(sim.threat.mode, 'patrol');
});

test('Spectral Glasses run for 4.0s, enter cooldown, and Glass Shards reset cooldown immediately', () => {
  const sim = createInitialSimulation({ autostart: true });

  const evOn = stepSimulation(sim, { ...IDLE_INPUT, glassesToggle: true }, 0.016);
  assert.equal(evOn.glassesToggled, true);
  assert.equal(sim.glasses.active, true);
  assert.ok(sim.glasses.activeTimer > GLASSES_ACTIVE_DURATION - 0.05);

  for (let i = 0; i < 82; i++) {
    stepSimulation(sim, IDLE_INPUT, 0.05);
  }
  assert.equal(sim.glasses.active, false);
  assert.ok(sim.glasses.cooldownTimer > GLASSES_COOLDOWN_DURATION - 0.2);

  stepSimulation(sim, { ...IDLE_INPUT, glassesToggle: true }, 0.016);
  assert.equal(sim.glasses.active, false);

  const shard = INITIAL_GLASS_SHARDS.find((s) => s.id === 'shard_ballroom_balcony')!;
  sim.player.x = shard.x;
  sim.player.y = shard.y;
  sim.player.z = shard.z + 0.55;
  sim.player.yaw = 0;
  const evShard = stepSimulation(sim, { ...IDLE_INPUT, interactPressed: true }, 0.016);
  assert.equal(evShard.shardPickup, true);
  assert.equal(sim.glasses.cooldownTimer, 0);
  assert.equal(sim.glasses.shardsCollected, 1);

  stepSimulation(sim, { ...IDLE_INPUT, glassesToggle: true }, 0.016);
  assert.equal(sim.glasses.active, true);
});

test('Architecture Shift 1: Cabin 3 Disappearing Door seals exit on turn and opens Secret Wardrobe passage', () => {
  const sim = createInitialSimulation({ autostart: true });
  const shard3 = INITIAL_GLASS_SHARDS.find((s) => s.id === 'shard_cabin3')!;
  sim.player.x = shard3.x;
  sim.player.y = shard3.y;
  sim.player.z = shard3.z + 0.55;
  sim.player.yaw = 0;

  stepSimulation(sim, { ...IDLE_INPUT, interactPressed: true }, 0.016);
  assert.equal(sim.shifts.cabin3PickupTaken, true);
  assert.equal(sim.shifts.cabin3Sealed, false);

  sim.player.yaw = -Math.PI / 2;
  const evShift = stepSimulation(sim, IDLE_INPUT, 0.016);
  assert.equal(evShift.architectureShift, 'cabin3_sealed');
  assert.equal(sim.shifts.cabin3Sealed, true);
  assert.equal(sim.shifts.cabin3SecretOpen, true);
  assert.equal(isWallCell(17, 4, 1, sim.shifts.gridOverrides), true);
  assert.equal(isWallCell(19, 6, 1, sim.shifts.gridOverrides), false);

  const route = findNextGridStep(
    19.5 * TILE_SIZE,
    FLOOR2_Y,
    4.5 * TILE_SIZE,
    16.5 * TILE_SIZE,
    FLOOR2_Y,
    9.5 * TILE_SIZE,
    sim.doors,
    sim.shifts.gridOverrides
  );
  assert.equal(route.reachable, true);
});

test('Architecture Shift 2: Endless Corridor loops player East and Ringing Rotary Phone breaks the loop', () => {
  const sim = createInitialSimulation({ autostart: true });
  sim.threat.x = 11.5 * TILE_SIZE;
  sim.threat.y = 0;
  sim.threat.z = 14.5 * TILE_SIZE;

  sim.itemsFound = 1;
  sim.player.x = 8.0 * TILE_SIZE;
  sim.player.y = FLOOR2_Y;
  sim.player.z = 1.5 * TILE_SIZE;
  sim.player.yaw = Math.PI / 2;

  const evEnter = stepSimulation(sim, IDLE_INPUT, 0.016);
  assert.equal(sim.shifts.endlessLoopActive, true);
  assert.equal(sim.shifts.phoneSpawned, true);
  assert.equal(evEnter.phoneRinging, true);
  assert.equal(isWallCell(9, 1, 1, sim.shifts.gridOverrides), true);

  // Walking West past threshold loops player back East seamlessly
  sim.player.x = ENDLESS_CORRIDOR_BOUNDS.loopThresholdX - 0.1;
  const evLoop = stepSimulation(sim, { ...IDLE_INPUT, moveForward: 1 }, 0.04);
  assert.equal(evLoop.architectureShift, 'endless_loop');
  assert.ok(sim.player.x > ENDLESS_CORRIDOR_BOUNDS.loopThresholdX + 4.0);

  // Answer the ringing Rotary Telephone to shatter the endless corridor shift
  const phone = sim.phones.find((p) => p.id === 'phone_endless_corridor')!;
  sim.player.x = phone.x;
  sim.player.y = phone.y;
  sim.player.z = phone.z + 0.7;
  sim.player.yaw = 0;
  const evAnswer = stepSimulation(sim, { ...IDLE_INPUT, interactPressed: true }, 0.016);
  assert.equal(evAnswer.phoneAnswered, true);
  assert.equal(evAnswer.architectureShift, 'phone_loop_broken');
  assert.equal(sim.shifts.endlessLoopSolved, true);
  assert.equal(sim.shifts.endlessLoopActive, false);
  assert.equal(isWallCell(9, 1, 1, sim.shifts.gridOverrides), false);
});

test('Architecture Shift 3: Midnight Quake collapses Main Stairs & guarantees zero soft-locks across both floors', () => {
  const sim = createInitialSimulation({ autostart: true });
  sim.steamShutOff = true;
  sim.inventory.push('power_fuse');
  sim.player.x = BREAKER_BOX_POS.interactX;
  sim.player.y = BREAKER_BOX_POS.y;
  sim.player.z = BREAKER_BOX_POS.interactZ;
  sim.player.yaw = Math.PI / 2;

  const ev = stepSimulation(sim, { ...IDLE_INPUT, interactPressed: true }, 0.016);
  assert.equal(ev.breakerRestored, true);
  assert.equal(ev.midnightQuake, true);
  assert.equal(sim.shifts.midnightQuakeTriggered, true);

  assert.equal(sim.shifts.gridOverrides[gridOverrideKey(0, 6, 6)], '#');
  assert.equal(sim.shifts.gridOverrides[gridOverrideKey(0, 11, 9)], '#');
  assert.equal(sim.shifts.gridOverrides[gridOverrideKey(1, 11, 5)], '#');
  assert.equal(sim.shifts.gridOverrides[gridOverrideKey(0, 2, 7)], '.');
  assert.equal(sim.shifts.gridOverrides[gridOverrideKey(0, 4, 12)], '.');

  const toExit = findNextGridStep(
    3.5 * TILE_SIZE,
    0,
    2.5 * TILE_SIZE,
    11.5 * TILE_SIZE,
    0,
    21.5 * TILE_SIZE,
    sim.doors,
    sim.shifts.gridOverrides
  );
  assert.equal(toExit.reachable, true);

  const toFloor2 = findNextGridStep(
    3.5 * TILE_SIZE,
    0,
    2.5 * TILE_SIZE,
    19.5 * TILE_SIZE,
    FLOOR2_Y,
    20.5 * TILE_SIZE,
    sim.doors,
    sim.shifts.gridOverrides
  );
  assert.equal(toFloor2.reachable, true);
});

test('1-hit kill triggers Devour Jumpscare -> 1.5s Rebirth -> wakes on Loop 2 with ALL progress preserved', () => {
  const sim = createInitialSimulation({ autostart: true });
  // Simulate partial run progress before death
  sim.inventory.push('ward_key', 'valve_wheel');
  sim.itemsFound = 2;
  sim.steamShutOff = true;
  sim.lore[0].inspected = true;
  const ballroomDoor = sim.doors.find((d) => d.id === 'ballroom_west_door')!;
  ballroomDoor.state = 'open';

  const spot = HIDE_SPOTS.find((s) => s.id === 'hide_cabin3_locker')!;
  sim.player.x = spot.x - 0.8;
  sim.player.y = spot.y;
  sim.player.z = spot.z;
  sim.player.yaw = -Math.PI / 2;

  sim.threat.x = 18.5 * TILE_SIZE;
  sim.threat.y = FLOOR2_Y;
  sim.threat.z = spot.z;
  stepSimulation(sim, { ...IDLE_INPUT, interactPressed: true }, 0.016);
  assert.equal(sim.player.hidingSpotId, spot.id);
  assert.equal(sim.threat.sawPlayerHideId, spot.id);

  let torn = false;
  for (let i = 0; i < 80; i++) {
    const ev = stepSimulation(sim, IDLE_INPUT, 0.04);
    if (ev.lockerTornOpen) {
      torn = true;
      break;
    }
  }
  assert.equal(torn, true);
  assert.equal(sim.player.hidingSpotId, null);
  assert.equal(sim.player.strikesRemaining, 0);
  // Instant 1-hit lethal transitions directly to devour jumpscare!
  assert.equal(sim.phase, 'jumpscare');

  // Step through 1.45s jumpscare -> enters 1.5s 'rebirth' blackout
  let rebirthStarted = false;
  for (let i = 0; i < 45; i++) {
    const ev = stepSimulation(sim, IDLE_INPUT, 0.04);
    if (ev.rebirthStarted) {
      rebirthStarted = true;
      break;
    }
  }
  assert.equal(rebirthStarted, true);
  assert.equal(sim.phase, 'rebirth');

  // Step through 1.5s rebirth blackout -> wakes up in Loop 2 with full inventory/progress intact!
  let reborn = false;
  for (let i = 0; i < 45; i++) {
    const ev = stepSimulation(sim, IDLE_INPUT, 0.04);
    if (ev.rebirthCompleted) {
      reborn = true;
      break;
    }
  }
  assert.equal(reborn, true);
  assert.equal(sim.phase, 'playing');
  assert.equal(sim.loopCount, 2);
  assert.equal(sim.player.strikesRemaining, 1);
  assert.deepEqual(sim.inventory, ['ward_key', 'valve_wheel']);
  assert.equal(sim.itemsFound, 2);
  assert.equal(sim.steamShutOff, true);
  assert.equal(sim.lore[0].inspected, true);
  assert.equal(ballroomDoor.state, 'open');
  assert.ok(sim.echoRecord !== null && sim.echoRecord.loopNumber === 1);
});

test('Throwable glass bottle arcs, shatters, and diverts Resident to investigate the crash site', () => {
  const sim = createInitialSimulation({ autostart: true });
  sim.player.x = 11.5 * TILE_SIZE;
  sim.player.y = 0;
  sim.player.z = 16.5 * TILE_SIZE;
  sim.player.yaw = 0; // North into Grand Ballroom
  sim.player.pitch = 0;
  sim.player.bottlesCount = 2;

  // Put Resident in East Library (no LoS behind Ballroom-Library wall, < 34m hearing range)
  sim.threat.mode = 'patrol';
  sim.threat.x = 18.5 * TILE_SIZE;
  sim.threat.y = 0;
  sim.threat.z = 15.0 * TILE_SIZE;

  const evThrow = stepSimulation(sim, { ...IDLE_INPUT, throwPressed: true }, 0.016);
  assert.equal(evThrow.bottleThrown, true);
  assert.equal(sim.player.bottlesCount, 1);
  assert.equal(sim.projectiles.length, 1);

  let shatteredPos: { x: number; y: number; z: number } | null = null;
  for (let i = 0; i < 60; i++) {
    const ev = stepSimulation(sim, IDLE_INPUT, 0.04);
    if (ev.bottleShattered) {
      shatteredPos = ev.bottleShattered;
      break;
    }
  }
  assert.ok(shatteredPos !== null, 'Thrown bottle should shatter on floor or wall');
  assert.equal(sim.threat.mode, 'investigate');
  assert.ok(Math.hypot(sim.threat.targetX - shatteredPos!.x, sim.threat.targetZ - shatteredPos!.z) < 0.01);
});

test('Pocket Radio static climbs inside 25m and emits through-wall whisper without LoS inside 10m', () => {
  const sim = createInitialSimulation({ autostart: true });
  // Place player in Kitchen (col 3, row 17) and Threat behind North Pantry wall (col 3, row 15) ~4m away, zero LoS
  sim.player.x = 3.5 * TILE_SIZE;
  sim.player.y = 0;
  sim.player.z = 17.5 * TILE_SIZE;
  sim.threat.x = 3.5 * TILE_SIZE;
  sim.threat.y = 0;
  sim.threat.z = 15.0 * TILE_SIZE;
  sim.paranoia.radioWhisperCooldown = 0;

  const hud = buildHudSnapshot(sim);
  assert.ok(hud.radioStaticLevel > 0.5, `Expected strong radio static within 5m, got ${hud.radioStaticLevel}`);

  const ev = stepSimulation(sim, IDLE_INPUT, 0.04);
  assert.equal(ev.radioWhisper, true);
  assert.ok(sim.paranoia.radioMessage !== null);
});

test('Auditory Paranoia triggers footsteps behind after 6s of no turning, and flashes eyes on abrupt turn', () => {
  const sim = createInitialSimulation({ autostart: true });
  sim.threat.x = 19.5 * TILE_SIZE;
  sim.threat.y = FLOOR2_Y;
  sim.threat.z = 3.5 * TILE_SIZE;
  sim.player.x = 11.5 * TILE_SIZE;
  sim.player.y = 0;
  sim.player.z = 16.5 * TILE_SIZE;
  sim.player.yaw = 0;
  sim.paranoia.ghostFootstepsCooldown = 0;

  let ghostSteps = false;
  for (let i = 0; i < 160; i++) {
    const ev = stepSimulation(sim, { ...IDLE_INPUT, moveForward: 0.5 }, 0.04);
    if (ev.ghostFootstepsBehind) {
      ghostSteps = true;
      break;
    }
  }
  assert.equal(ghostSteps, true);
  assert.equal(sim.paranoia.ghostFootstepsActive, true);

  const evTurn = stepSimulation(sim, { ...IDLE_INPUT, yawDelta: 0.45 }, 0.016);
  assert.equal(evTurn.ghostEyeFlash, true);
  assert.ok(sim.paranoia.ghostEyeFlashTimer > 0);
});

test('Resident pauses 2.0 seconds to smash through a closed door', () => {
  const sim = createInitialSimulation({ autostart: true });
  const targetDoor = sim.doors.find((d) => d.id === 'east_study_door')!;
  assert.equal(targetDoor.state, 'closed');

  sim.threat.x = 19.5 * TILE_SIZE;
  sim.threat.y = 0;
  sim.threat.z = 4.2 * TILE_SIZE;
  sim.threat.mode = 'investigate';
  sim.threat.targetX = 19.5 * TILE_SIZE;
  sim.threat.targetY = 0;
  sim.threat.targetZ = 6.5 * TILE_SIZE;

  for (let i = 0; i < 20; i++) {
    stepSimulation(sim, IDLE_INPUT, 0.04);
    if ((sim.threat.mode as string) === 'smash_door') break;
  }
  assert.equal(sim.threat.mode, 'smash_door');
  assert.equal(sim.threat.smashingDoorId, targetDoor.id);

  for (let i = 0; i < 25; i++) {
    stepSimulation(sim, IDLE_INPUT, 0.04);
  }
  assert.equal(targetDoor.state, 'closed');

  let slammed = false;
  for (let i = 0; i < 30; i++) {
    const ev = stepSimulation(sim, IDLE_INPUT, 0.04);
    if (ev.doorSlammed) slammed = true;
  }
  assert.equal(slammed, true);
  assert.equal(targetDoor.state, 'open');
});

test('Kitchen counter blocks line of sight and camera pitch clamps strictly to [-1.3, 1.3]', () => {
  const sim = createInitialSimulation({ autostart: true });
  const blocked = hasLineOfSight(
    1.5 * TILE_SIZE,
    0,
    19.0 * TILE_SIZE,
    4.3 * TILE_SIZE,
    0,
    19.0 * TILE_SIZE,
    sim.doors,
    sim.shifts.gridOverrides
  );
  assert.equal(blocked, false);

  stepSimulation(sim, { ...IDLE_INPUT, pitchDelta: 5.0 }, 0.016);
  assert.equal(sim.player.pitch, 1.3);
  stepSimulation(sim, { ...IDLE_INPUT, pitchDelta: -10.0 }, 0.016);
  assert.equal(sim.player.pitch, -1.3);
});

test('creaky floorboards emit noise when standing and stay silent when crouched', () => {
  const sim = createInitialSimulation({ autostart: true });
  const cf = CREAKY_FLOORS[0];
  sim.player.x = (cf.minX + cf.maxX) * 0.5;
  sim.player.y = 0;
  sim.player.z = (cf.minZ + cf.maxZ) * 0.5;
  sim.player.crouching = false;

  const evStand = stepSimulation(sim, { ...IDLE_INPUT, moveForward: 1 }, 0.04);
  assert.equal(evStand.creakyBoard, true);
  assert.ok(sim.player.noiseLevel >= 0.8);

  sim.player.crouching = true;
  sim.player.creakCooldown = 0;
  sim.player.noiseLevel = 0;
  const evCrouch = stepSimulation(sim, { ...IDLE_INPUT, moveForward: 1 }, 0.04);
  assert.equal(evCrouch.creakyBoard, false);
  assert.ok(sim.player.noiseLevel < 0.2);
});

test('full 4-item 2-story escape puzzle reaches victory', () => {
  const sim = createInitialSimulation({ autostart: true, seed: 101 });
  sim.threat.x = 19.5 * TILE_SIZE;
  sim.threat.y = FLOOR2_Y;
  sim.threat.z = 3.5 * TILE_SIZE;

  const pickItem = (id: 'ward_key' | 'valve_wheel' | 'power_fuse' | 'bolt_cutters') => {
    const it = sim.items.find((i) => i.id === id)!;
    sim.player.x = it.x;
    sim.player.y = it.y;
    sim.player.z = it.z + 0.55;
    sim.player.yaw = 0;
    stepSimulation(sim, { ...IDLE_INPUT, interactPressed: true }, 0.016);
    assert.ok(sim.inventory.includes(id), `Failed to pick up ${id}`);
  };

  pickItem('ward_key');
  sim.player.x = 16.4 * TILE_SIZE;
  sim.player.y = 0;
  sim.player.z = 20.5 * TILE_SIZE;
  sim.player.yaw = -Math.PI / 2;
  stepSimulation(sim, { ...IDLE_INPUT, interactPressed: true }, 0.016);
  assert.equal(sim.doors.find((d) => d.id === 'security_door')!.state, 'open');

  pickItem('valve_wheel');
  sim.player.x = STEAM_VALVE_POS.x;
  sim.player.y = STEAM_VALVE_POS.y;
  sim.player.z = STEAM_VALVE_POS.z + 0.85;
  sim.player.yaw = 0;
  stepSimulation(sim, { ...IDLE_INPUT, interactPressed: true }, 0.016);
  assert.equal(sim.steamShutOff, true);

  pickItem('power_fuse');
  sim.player.x = BREAKER_BOX_POS.interactX;
  sim.player.y = BREAKER_BOX_POS.y;
  sim.player.z = BREAKER_BOX_POS.interactZ;
  sim.player.yaw = Math.PI / 2;
  stepSimulation(sim, { ...IDLE_INPUT, interactPressed: true }, 0.016);
  assert.equal(sim.powerRestored, true);

  pickItem('bolt_cutters');
  sim.player.x = 11.5 * TILE_SIZE;
  sim.player.y = 0;
  sim.player.z = 21.4 * TILE_SIZE;
  sim.player.yaw = Math.PI;
  stepSimulation(sim, { ...IDLE_INPUT, interactPressed: true }, 0.016);
  assert.equal(sim.escaping, true);

  for (let i = 0; i < 25; i++) {
    stepSimulation(sim, IDLE_INPUT, 0.03);
  }
  assert.equal(sim.phase, 'gameover');
  assert.equal(sim.victory, true);
});

test('Triangle Echo corpse on Loop 2 yields note and stamina boost', () => {
  const sim = createInitialSimulation({
    autostart: true,
    loopCount: 2,
    previousEcho: {
      loopNumber: 1,
      deathX: 11.5 * TILE_SIZE,
      deathY: 0,
      deathZ: 19.5 * TILE_SIZE,
      noteText: 'Loop #1 — She heard me on the floorboards.',
      inspected: false,
    },
  });
  sim.player.stamina = 40;
  sim.player.x = 11.5 * TILE_SIZE;
  sim.player.y = 0;
  sim.player.z = 20.2 * TILE_SIZE;
  sim.player.yaw = 0;
  const ev = stepSimulation(sim, { ...IDLE_INPUT, interactPressed: true }, 0.016);
  assert.equal(ev.echoInspected, true);
  assert.ok(sim.player.stamina >= 75);
  assert.ok(sim.echoNoteText?.includes('Loop #1'));
});

test('Settings sanitization, localStorage persistence, and live monster speed scaling', () => {
  const clamped = sanitizeSettings({
    monsterSpeedMult: 4.5,
    glassesCooldownSec: 2,
    flashlightIntensity: 0.1,
    flashlightBatterySec: 999,
    sfxVolume: -1,
    ambientVolume: 2,
    fov: 150,
  });
  assert.equal(clamped.monsterSpeedMult, 1.5);
  assert.equal(clamped.glassesCooldownSec, 10);
  assert.equal(clamped.flashlightIntensity, 0.5);
  assert.equal(clamped.flashlightBatterySec, 180);
  assert.equal(clamped.sfxVolume, 0);
  assert.equal(clamped.ambientVolume, 1);
  assert.equal(clamped.fov, 95);

  const mem = new Map<string, string>();
  saveSettings(
    { ...DEFAULT_SETTINGS, monsterSpeedMult: 1.3, fov: 85 },
    { setItem: (k, v) => void mem.set(k, v) }
  );
  const loaded = loadSettings({ getItem: (k) => mem.get(k) ?? null });
  assert.equal(loaded.monsterSpeedMult, 1.3);
  assert.equal(loaded.fov, 85);

  // Live speed multiplier moves Threat faster on stepSimulation
  const sFast = createInitialSimulation({ autostart: true });
  sFast.player.x = 1.5 * TILE_SIZE;
  sFast.player.y = FLOOR2_Y;
  sFast.player.z = 3.5 * TILE_SIZE;
  sFast.threat.mode = 'patrol';
  sFast.threat.x = 11.5 * TILE_SIZE;
  sFast.threat.y = 0;
  sFast.threat.z = 19.5 * TILE_SIZE;
  sFast.threat.targetX = 11.5 * TILE_SIZE;
  sFast.threat.targetY = 0;
  sFast.threat.targetZ = 18.0 * TILE_SIZE;
  stepSimulation(sFast, IDLE_INPUT, 0.05, { ...DEFAULT_SETTINGS, monsterSpeedMult: 1.5 });
  const movedFast = 19.5 * TILE_SIZE - sFast.threat.z;
  assert.ok(movedFast > THREAT_PATROL_SPEED * 0.05 * 1.4);
});
