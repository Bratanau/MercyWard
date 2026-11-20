import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BREAKER_BOX_POS,
  CREAKY_FLOORS,
  ENDLESS_CORRIDOR_BOUNDS,
  FLOOR1_GRID,
  FLOOR2_GRID,
  FLOOR2_Y,
  GRID_COLS,
  GRID_ROWS,
  HIDE_SPOTS,
  INITIAL_GLASS_SHARDS,
  ITEM_SPAWN_POINTS,
  STEAM_VALVE_POS,
  TILE_SIZE,
} from './mapData';
import {
  assignRandomizedItems,
  createInitialSimulation,
  findNextGridStep,
  GLASSES_ACTIVE_DURATION,
  GLASSES_COOLDOWN_DURATION,
  gridOverrideKey,
  hasLineOfSight,
  isWallCell,
  PLAYER_RADIUS,
  resolveCircleMovement,
  ROOM_INSPECT_DURATION,
  SPRINT_SPEED,
  stepSimulation,
  THREAT_CHASE_SPEED,
  THREAT_PATROL_SPEED,
  WALK_SPEED,
  type InputSample,
} from './rules';

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
  assert.equal(isWallCell(pCol, pRow, 0), false);

  const tCol = Math.floor(sim.threat.x / TILE_SIZE);
  const tRow = Math.floor(sim.threat.z / TILE_SIZE);
  assert.equal(isWallCell(tCol, tRow, 1), false);

  // Resident starts far from player for early exploration breathing room
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

test('player smoothly traverses all 3 estate staircases (Main, West Service, Library)', () => {
  const sim = createInitialSimulation({ autostart: true });
  // Park Resident away from test paths
  sim.threat.x = 1.5 * TILE_SIZE;
  sim.threat.y = FLOOR2_Y;
  sim.threat.z = 3.5 * TILE_SIZE;

  // 1. Main Stairs (col 11, rows 8..6: South row 9 Y=0 -> North row 6 Y=3.5)
  sim.player.x = 11.5 * TILE_SIZE;
  sim.player.y = 0;
  sim.player.z = 9.2 * TILE_SIZE;
  sim.player.yaw = 0; // North (-Z)
  for (let i = 0; i < 65; i++) {
    stepSimulation(sim, { ...IDLE_INPUT, moveForward: 1 }, 0.04);
  }
  assert.ok(sim.player.y > 3.4, `Expected Floor 2 via Main Stairs, got Y=${sim.player.y}`);

  // 2. West Service Stairs (col 2, rows 11..9: South row 12 Y=3.5 -> North row 9 Y=0)
  sim.player.x = 2.5 * TILE_SIZE;
  sim.player.y = FLOOR2_Y;
  sim.player.z = 12.2 * TILE_SIZE;
  sim.player.yaw = 0; // North (-Z)
  for (let i = 0; i < 65; i++) {
    stepSimulation(sim, { ...IDLE_INPUT, moveForward: 1 }, 0.04);
  }
  assert.ok(sim.player.y < 0.15, `Expected Floor 1 via West Service Stairs, got Y=${sim.player.y}`);

  // 3. Library Grand Staircase (col 21, rows 14..12: South row 15 Y=0 -> North row 12 Y=3.5)
  sim.player.x = 21.5 * TILE_SIZE;
  sim.player.y = 0;
  sim.player.z = 15.2 * TILE_SIZE;
  sim.player.yaw = 0; // North (-Z)
  for (let i = 0; i < 65; i++) {
    stepSimulation(sim, { ...IDLE_INPUT, moveForward: 1 }, 0.04);
  }
  assert.ok(sim.player.y > 3.4, `Expected Floor 2 via Library Stairs, got Y=${sim.player.y}`);
});

test('Library Floor 2 Mezzanine guardrail stops falling into atrium while preserving open sightlines', () => {
  const sim = createInitialSimulation({ autostart: true });
  // Player on West Mezzanine balcony facing East across the 2-story atrium pit
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

  // East Mezzanine col 20 remains smoothly passable between Atrium rail (19.98) and Stair guard (20.88)
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

  // Line of sight across the open Library Atrium on Floor 2 is clear
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

test('3D multi-floor BFS navigates between Floor 1 and Floor 2 via estate stairs', () => {
  const sim = createInitialSimulation({ autostart: true });
  const t0 = performance.now();
  const step = findNextGridStep(
    11.5 * TILE_SIZE,
    0,
    19.5 * TILE_SIZE,
    16.5 * TILE_SIZE,
    FLOOR2_Y,
    10.5 * TILE_SIZE,
    sim.doors,
    sim.shifts.gridOverrides
  );
  const elapsedMs = performance.now() - t0;
  assert.equal(step.reachable, true);
  assert.ok(elapsedMs < 15, `Expected fast 23x23 3D BFS, took ${elapsedMs}ms`);
});

test('Monster rebalance: slower patrol, sprintable chase, and 4.0s inspect_room pause in major rooms', () => {
  assert.equal(THREAT_PATROL_SPEED, 1.8);
  assert.ok(WALK_SPEED < THREAT_CHASE_SPEED && THREAT_CHASE_SPEED < SPRINT_SPEED);

  const sim = createInitialSimulation({ autostart: true });
  // Place player safely out of sight on Floor 2
  sim.player.x = 1.5 * TILE_SIZE;
  sim.player.y = FLOOR2_Y;
  sim.player.z = 3.5 * TILE_SIZE;

  // Put Resident stepping into Grand Ballroom on patrol
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
  // After 2.0s Resident must still be paused inspecting the room
  for (let i = 0; i < 50; i++) {
    stepSimulation(sim, IDLE_INPUT, 0.04);
  }
  assert.equal(sim.threat.mode, 'inspect_room');
  assert.equal(sim.threat.x, xBeforePause);
  assert.equal(sim.threat.z, zBeforePause);

  // After another 2.2s Resident resumes patrolling
  for (let i = 0; i < 55; i++) {
    stepSimulation(sim, IDLE_INPUT, 0.04);
  }
  assert.equal(sim.threat.mode, 'patrol');
});

test('Spectral Glasses run for 4.0s, enter 25s cooldown, and Glass Shards reset cooldown immediately', () => {
  const sim = createInitialSimulation({ autostart: true });

  // Activate via toggle
  const evOn = stepSimulation(sim, { ...IDLE_INPUT, glassesToggle: true }, 0.016);
  assert.equal(evOn.glassesToggled, true);
  assert.equal(sim.glasses.active, true);
  assert.ok(sim.glasses.activeTimer > GLASSES_ACTIVE_DURATION - 0.05);

  // Tick 4.1s -> expires into 25s cooldown
  for (let i = 0; i < 82; i++) {
    stepSimulation(sim, IDLE_INPUT, 0.05);
  }
  assert.equal(sim.glasses.active, false);
  assert.ok(sim.glasses.cooldownTimer > GLASSES_COOLDOWN_DURATION - 0.2);

  // Pressing toggle during cooldown does NOT reactivate
  stepSimulation(sim, { ...IDLE_INPUT, glassesToggle: true }, 0.016);
  assert.equal(sim.glasses.active, false);

  // Pick up Glass Shard in Ballroom -> immediately resets cooldownTimer to 0
  const shard = INITIAL_GLASS_SHARDS.find((s) => s.id === 'shard_ballroom_balcony')!;
  sim.player.x = shard.x;
  sim.player.y = shard.y;
  sim.player.z = shard.z + 0.55;
  sim.player.yaw = 0;
  const evShard = stepSimulation(sim, { ...IDLE_INPUT, interactPressed: true }, 0.016);
  assert.equal(evShard.shardPickup, true);
  assert.equal(sim.glasses.cooldownTimer, 0);
  assert.equal(sim.glasses.shardsCollected, 1);

  // Now Spectral Glasses can activate immediately again
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

  // Collect Cabin 3 shard while facing North (still ~90 deg from West door, not > 120 deg)
  stepSimulation(sim, { ...IDLE_INPUT, interactPressed: true }, 0.016);
  assert.equal(sim.shifts.cabin3PickupTaken, true);
  assert.equal(sim.shifts.cabin3Sealed, false);

  // Turn East (yaw = -Math.PI/2, > 120 deg away from West door at (17, 4))
  sim.player.yaw = -Math.PI / 2;
  const evShift = stepSimulation(sim, IDLE_INPUT, 0.016);
  assert.equal(evShift.architectureShift, 'cabin3_sealed');
  assert.equal(sim.shifts.cabin3Sealed, true);
  assert.equal(sim.shifts.cabin3SecretOpen, true);
  assert.equal(isWallCell(17, 4, 1, sim.shifts.gridOverrides), true);
  assert.equal(isWallCell(19, 6, 1, sim.shifts.gridOverrides), false);

  // Verify BFS routes cleanly out of Cabin 3 via opened Secret Wardrobe (19, 6)
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

test('Architecture Shift 2: Endless Corridor loops player East and spawns Red Door to break the loop', () => {
  const sim = createInitialSimulation({ autostart: true });
  // Keep Resident far away on Floor 1
  sim.threat.x = 11.5 * TILE_SIZE;
  sim.threat.y = 0;
  sim.threat.z = 14.5 * TILE_SIZE;

  // Condition requires >= 1 item found
  sim.itemsFound = 1;
  sim.player.x = 8.0 * TILE_SIZE;
  sim.player.y = FLOOR2_Y;
  sim.player.z = 1.5 * TILE_SIZE;
  sim.player.yaw = Math.PI / 2; // Facing West

  stepSimulation(sim, IDLE_INPUT, 0.016);
  assert.equal(sim.shifts.endlessLoopActive, true);
  assert.equal(sim.shifts.redDoorAppeared, true);

  // Walking West past threshold loops player back East seamlessly
  sim.player.x = ENDLESS_CORRIDOR_BOUNDS.loopThresholdX - 0.1;
  const evLoop = stepSimulation(sim, { ...IDLE_INPUT, moveForward: 1 }, 0.04);
  assert.equal(evLoop.architectureShift, 'endless_loop');
  assert.ok(sim.player.x > ENDLESS_CORRIDOR_BOUNDS.loopThresholdX + 4.0);

  // Turn around East toward the Red Door at col 9 and interact to break the loop
  sim.player.x = 8.4 * TILE_SIZE;
  sim.player.z = 1.5 * TILE_SIZE;
  sim.player.yaw = -Math.PI / 2; // East toward col 9
  const evRed = stepSimulation(sim, { ...IDLE_INPUT, interactPressed: true }, 0.016);
  assert.equal(evRed.architectureShift, 'red_door_opened');
  assert.equal(sim.shifts.endlessLoopSolved, true);
  assert.equal(sim.shifts.endlessLoopActive, false);
});

test('Architecture Shift 3: Midnight Quake collapses Main Stairs & guarantees zero soft-locks across both floors', () => {
  const sim = createInitialSimulation({ autostart: true });
  sim.steamShutOff = true;
  sim.inventory.push('power_fuse');
  sim.player.x = BREAKER_BOX_POS.interactX;
  sim.player.y = BREAKER_BOX_POS.y;
  sim.player.z = BREAKER_BOX_POS.interactZ;
  sim.player.yaw = Math.PI / 2; // Facing West wall Breaker Box

  const ev = stepSimulation(sim, { ...IDLE_INPUT, interactPressed: true }, 0.016);
  assert.equal(ev.breakerRestored, true);
  assert.equal(ev.midnightQuake, true);
  assert.equal(sim.shifts.midnightQuakeTriggered, true);

  // Main Stairs & Boiler shortcut sealed; West Cellar route blasted open
  assert.equal(sim.shifts.gridOverrides[gridOverrideKey(0, 6, 6)], '#');
  assert.equal(sim.shifts.gridOverrides[gridOverrideKey(0, 11, 9)], '#');
  assert.equal(sim.shifts.gridOverrides[gridOverrideKey(1, 11, 5)], '#');
  assert.equal(sim.shifts.gridOverrides[gridOverrideKey(0, 2, 7)], '.');
  assert.equal(sim.shifts.gridOverrides[gridOverrideKey(0, 4, 12)], '.');

  // Verify zero soft-locks: Boiler Utility reaches Floor 1 Exit AND Floor 2 Master Bedroom post-Quake
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
  assert.equal(toExit.reachable, true, 'Player in Boiler must still reach Exit post-Quake');

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
  assert.equal(toFloor2.reachable, true, 'Player in Boiler must still reach Floor 2 via West Stairs post-Quake');
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
  assert.equal(sim.threat.mode, 'smash_door');

  let slammed = false;
  for (let i = 0; i < 30; i++) {
    const ev = stepSimulation(sim, IDLE_INPUT, 0.04);
    if (ev.doorSlammed) slammed = true;
  }
  assert.equal(slammed, true);
  assert.equal(targetDoor.state, 'open');
  assert.notEqual(sim.threat.mode, 'smash_door');
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

  // 1. Pick up Security Key and unlock Security Storage Room at (17, 20)
  pickItem('ward_key');
  sim.player.x = 16.4 * TILE_SIZE;
  sim.player.y = 0;
  sim.player.z = 20.5 * TILE_SIZE;
  sim.player.yaw = -Math.PI / 2; // East toward (17, 20)
  stepSimulation(sim, { ...IDLE_INPUT, interactPressed: true }, 0.016);
  assert.equal(sim.doors.find((d) => d.id === 'security_door')!.state, 'open');

  // 2. Pick up Valve Wheel & Shut off Steam Valve
  pickItem('valve_wheel');
  sim.player.x = STEAM_VALVE_POS.x;
  sim.player.y = STEAM_VALVE_POS.y;
  sim.player.z = STEAM_VALVE_POS.z + 0.85;
  sim.player.yaw = 0;
  stepSimulation(sim, { ...IDLE_INPUT, interactPressed: true }, 0.016);
  assert.equal(sim.steamShutOff, true);

  // 3. Pick up High-Volt Fuse & Restore Boiler Breaker (triggers Midnight Quake)
  pickItem('power_fuse');
  sim.player.x = BREAKER_BOX_POS.interactX;
  sim.player.y = BREAKER_BOX_POS.y;
  sim.player.z = BREAKER_BOX_POS.interactZ;
  sim.player.yaw = Math.PI / 2;
  stepSimulation(sim, { ...IDLE_INPUT, interactPressed: true }, 0.016);
  assert.equal(sim.powerRestored, true);

  // 4. Pick up Bolt Cutters & Cut Entrance Exit Chains at (11, 22)
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

test('seen hiding causes Resident to tear locker open and 3rd strike triggers jumpscare then defeat', () => {
  const sim = createInitialSimulation({ autostart: true });
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
  assert.equal(sim.player.strikesRemaining, 2);

  for (let s = 0; s < 2; s++) {
    sim.player.invulnTimer = 0;
    sim.threat.hitCooldown = 0;
    sim.threat.x = sim.player.x;
    sim.threat.y = sim.player.y;
    sim.threat.z = sim.player.z - 0.35;
    stepSimulation(sim, IDLE_INPUT, 0.04);
  }
  assert.equal(sim.phase, 'jumpscare');

  for (let i = 0; i < 40; i++) {
    stepSimulation(sim, IDLE_INPUT, 0.04);
  }
  assert.equal(sim.phase, 'gameover');
  assert.equal(sim.victory, false);
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

test('resolveCircleMovement keeps player within floor walls', () => {
  const sim = createInitialSimulation({ autostart: true });
  const moved = resolveCircleMovement(11.5 * TILE_SIZE, 0, 21.0 * TILE_SIZE, 3.0, 0, PLAYER_RADIUS, sim.doors);
  assert.ok(moved.x < 15.0 * TILE_SIZE);
});
