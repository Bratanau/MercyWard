import {
  BREAKER_BOX_POS,
  CREAKY_FLOORS,
  ENDLESS_CORRIDOR_BOUNDS,
  FLOOR2_Y,
  FLOOR_GRIDS,
  FURNITURE_OBSTACLES,
  generateProceduralWingOverrides,
  getFloorIndexFromY,
  getSurfaceY,
  getZoneAt,
  GRID_COLS,
  GRID_ROWS,
  HAUNTED_MIRRORS,
  HIDE_SPOTS,
  HIDE_TABLES,
  INITIAL_DOORS,
  INITIAL_GLASS_SHARDS,
  INITIAL_KNOCKABLES,
  INITIAL_LORE_ITEMS,
  INITIAL_ROTARY_PHONES,
  INITIAL_THROWABLES,
  isLibraryAtriumCell,
  ITEM_CATALOG,
  ITEM_SPAWN_POINTS,
  MAJOR_INSPECT_ZONES,
  PLAYER_SPAWN,
  RANDOM_SPAWN_POINTS,
  STEAM_VALVE_POS,
  THREAT_PATROL_WAYPOINTS,
  THREAT_SPAWN,
  TILE_SIZE,
} from './mapData';
import { DEFAULT_SETTINGS, GameSettings } from './settings';
import {
  ArchitectureShiftState,
  DoorRuntime,
  EchoRecord,
  FloorIndex,
  GameHudSnapshot,
  GamePhase,
  GlassesState,
  GlassShardRuntime,
  ItemId,
  KnockablePropRuntime,
  LoreItemRuntime,
  LoreKind,
  ObstacleBox,
  ParanoiaState,
  PhantomEchoState,
  PlayerState,
  RotaryPhoneRuntime,
  ThreatState,
  ThrowablePickupRuntime,
  ThrownProjectile,
  WorldItemRuntime,
} from './types';

export const PLAYER_RADIUS = 0.34;
export const THREAT_RADIUS = 0.38;
export const WALK_SPEED = 3.5;
export const SPRINT_SPEED = 5.4;
export const CROUCH_SPEED = 2.1;

// Monster Speeds (scaled live by settings.monsterSpeedMult)
export const THREAT_PATROL_SPEED = 1.8;
export const THREAT_INVESTIGATE_SPEED = 2.65;
export const THREAT_CHASE_SPEED = 4.65;
export const ROOM_INSPECT_DURATION = 4.0;

export const INTERACT_RANGE = 2.75;
export const CATCH_RANGE = 1.18;
export const THREAT_SIGHT_RANGE = 17.5;
export const DOOR_SMASH_DURATION = 2.0;

export const JUMPSCARE_DURATION = 1.45;
export const REBIRTH_DURATION = 1.5;

// Spectral Glasses Constants
export const GLASSES_ACTIVE_DURATION = 4.0;
export const GLASSES_COOLDOWN_DURATION = 25.0;

export interface SimulationState {
  phase: GamePhase;
  victory: boolean;
  seed: number;
  loopCount: number;
  elapsedSeconds: number;
  steamShutOff: boolean;
  powerRestored: boolean;
  player: PlayerState;
  threat: ThreatState;
  doors: DoorRuntime[];
  items: WorldItemRuntime[];
  shards: GlassShardRuntime[];
  throwables: ThrowablePickupRuntime[];
  projectiles: ThrownProjectile[];
  nextProjectileId: number;
  lore: LoreItemRuntime[];
  loreOverlay: { title: string; kind: LoreKind; text: string } | null;
  loreOverlayTimer: number;
  phones: RotaryPhoneRuntime[];
  paranoia: ParanoiaState;
  glasses: GlassesState;
  glassesCooldownMax: number;
  shifts: ArchitectureShiftState;
  knockables: KnockablePropRuntime[];
  inventory: ItemId[];
  selectedSlot: number;
  roomsUnlocked: number;
  itemsFound: number;
  damageFlash: number;
  statusBanner: string | null;
  statusBannerTimer: number;
  echoRecord: EchoRecord | null;
  echoNoteText: string | null;
  echoNoteTimer: number;
  phantomEcho: PhantomEchoState;
  jumpscareTimer: number;
  jumpscareProgress: number;
  rebirthTimer: number;
  rebirthProgress: number;
  escapeTimer: number;
  escaping: boolean;
  lastDeathReason: string;
  lockerCheckCooldown: number;
  lastRoomZone: string;
}

export interface InputSample {
  moveForward: number;
  moveRight: number;
  sprint: boolean;
  crouchToggle: boolean;
  interactPressed: boolean;
  glassesToggle?: boolean;
  throwPressed?: boolean;
  flashlightToggle?: boolean;
  yawDelta: number;
  pitchDelta: number;
}

export type ShiftEventKind =
  | 'cabin3_sealed'
  | 'endless_loop'
  | 'phone_loop_broken'
  | 'dream_shift'
  | 'midnight_quake';

export interface StepEvents {
  footstepPlayer: boolean;
  footstepThreat: boolean;
  creakyBoard: boolean;
  propKnocked: string | null;
  pickup: ItemId | null;
  shardPickup: boolean;
  throwablePickup: boolean;
  bottleThrown: boolean;
  bottleShattered: { x: number; y: number; z: number; floor: FloorIndex } | null;
  loreInspected: boolean;
  phoneRinging: boolean;
  phoneAnswered: boolean;
  radioWhisper: boolean;
  ghostFootstepsBehind: boolean;
  ghostEyeFlash: boolean;
  mirrorHaunted: boolean;
  glassesToggled: boolean;
  midnightQuake: boolean;
  architectureShift: ShiftEventKind | null;
  doorOpened: boolean;
  doorSlammed: boolean;
  doorUnlocked: boolean;
  doorLockedRattle: boolean;
  steamShutOff: boolean;
  breakerRestored: boolean;
  hideToggle: boolean;
  lockerTornOpen: boolean;
  threatSniff: boolean;
  threatAlerted: boolean;
  playerHit: boolean;
  jumpscareStarted: boolean;
  rebirthStarted: boolean;
  rebirthCompleted: boolean;
  escaped: boolean;
  defeated: boolean;
  echoInspected: boolean;
  phantomTriggered: boolean;
}

export type InteractionTarget =
  | { kind: 'item'; item: WorldItemRuntime; label: string; actionable: boolean }
  | { kind: 'shard'; shard: GlassShardRuntime; label: string; actionable: boolean }
  | { kind: 'throwable'; pickup: ThrowablePickupRuntime; label: string; actionable: boolean }
  | { kind: 'lore'; lore: LoreItemRuntime; label: string; actionable: boolean }
  | { kind: 'phone'; phone: RotaryPhoneRuntime; label: string; actionable: boolean }
  | { kind: 'door'; door: DoorRuntime; label: string; actionable: boolean }
  | { kind: 'valve'; label: string; actionable: boolean }
  | { kind: 'breaker'; label: string; actionable: boolean }
  | { kind: 'hide'; spotId: string; label: string; actionable: boolean }
  | { kind: 'echo'; label: string; actionable: boolean };

function makeRng(seed: number): () => number {
  let s = (seed || 1337) >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function gridOverrideKey(floor: FloorIndex, col: number, row: number): string {
  return `${floor}:${col},${row}`;
}

export function assignRandomizedItems(seed: number): WorldItemRuntime[] {
  const rand = makeRng(seed);
  const openSpawns = ITEM_SPAWN_POINTS.filter((p) => p.tier === 'open');
  const shuffledOpen = [...openSpawns].sort(() => rand() - 0.5);

  // Security Room Key MUST spawn in an 'open' tier location so Floor 1 Security Room is always unlockable
  const wardKeySpawn = shuffledOpen[0];

  const remainingSpawns = ITEM_SPAWN_POINTS.filter((p) => p.id !== wardKeySpawn.id).sort(
    () => rand() - 0.5
  );

  const otherItems: ItemId[] = ['valve_wheel', 'power_fuse', 'bolt_cutters'];
  const result: WorldItemRuntime[] = [
    {
      id: 'ward_key',
      spawnId: wardKeySpawn.id,
      floor: wardKeySpawn.floor,
      x: wardKeySpawn.x,
      y: wardKeySpawn.y,
      z: wardKeySpawn.z,
      surfaceY: wardKeySpawn.surfaceY,
      collected: false,
    },
  ];

  otherItems.forEach((id, idx) => {
    const sp = remainingSpawns[idx];
    result.push({
      id,
      spawnId: sp.id,
      floor: sp.floor,
      x: sp.x,
      y: sp.y,
      z: sp.z,
      surfaceY: sp.surfaceY,
      collected: false,
    });
  });

  return result;
}

function pickDistantThreatWaypoint(px: number, pz: number, seed: number): {
  spawn: { x: number; y: number; z: number };
  patrolIndex: number;
} {
  const candidates = THREAT_PATROL_WAYPOINTS.map((wp, idx) => ({
    wp,
    idx,
    dist: Math.hypot(wp.x - px, wp.z - pz),
  })).filter((c) => c.dist >= 19.5);

  if (candidates.length === 0) {
    return { spawn: { ...THREAT_SPAWN }, patrolIndex: 1 };
  }
  const chosen = candidates[Math.abs(seed) % candidates.length];
  return {
    spawn: { ...chosen.wp },
    patrolIndex: (chosen.idx + 1) % THREAT_PATROL_WAYPOINTS.length,
  };
}

export interface CreateSimOptions {
  autostart?: boolean;
  seed?: number;
  loopCount?: number;
  previousEcho?: EchoRecord | null;
  randomizeSpawn?: boolean;
}

export function createInitialSimulation(options: CreateSimOptions | boolean = false): SimulationState {
  const opts: CreateSimOptions =
    typeof options === 'boolean' ? { autostart: options } : options;
  const autostart = Boolean(opts.autostart);
  const loopCount = opts.loopCount ?? 1;
  const seed = opts.seed ?? (loopCount * 7919 + 404);
  const useRandomSpawn = opts.randomizeSpawn ?? false;

  const rand = makeRng(seed + 19);
  const chosenSpawn = useRandomSpawn
    ? RANDOM_SPAWN_POINTS[Math.floor(rand() * RANDOM_SPAWN_POINTS.length)]
    : { ...PLAYER_SPAWN, floor: 0 as FloorIndex, zone: 'entrance' as const };
  const spawnYaw = useRandomSpawn ? (rand() * Math.PI * 2) - Math.PI : chosenSpawn.yaw;

  const wingOverrides = generateProceduralWingOverrides(seed);
  const threatPick = useRandomSpawn
    ? pickDistantThreatWaypoint(chosenSpawn.x, chosenSpawn.z, seed)
    : { spawn: { ...THREAT_SPAWN }, patrolIndex: 1 };
  const targetWp = THREAT_PATROL_WAYPOINTS[threatPick.patrolIndex];

  return {
    phase: autostart ? 'playing' : 'title',
    victory: false,
    seed,
    loopCount,
    elapsedSeconds: 0,
    steamShutOff: false,
    powerRestored: false,
    player: {
      x: chosenSpawn.x,
      y: chosenSpawn.y,
      z: chosenSpawn.z,
      yaw: spawnYaw,
      pitch: 0,
      crouching: false,
      isUnderTable: false,
      underTableId: null,
      sprinting: false,
      hidingSpotId: null,
      stamina: 100,
      flashlightOn: true,
      battery: 100,
      bottlesCount: 1,
      strikesRemaining: 1, // 1-hit lethal threat!
      invulnTimer: 0,
      noiseLevel: 0,
      stepAccum: 0,
      creakCooldown: 0,
    },
    threat: {
      x: threatPick.spawn.x,
      y: threatPick.spawn.y,
      z: threatPick.spawn.z,
      yaw: THREAT_SPAWN.yaw,
      mode: 'patrol',
      targetX: targetWp.x,
      targetY: targetWp.y,
      targetZ: targetWp.z,
      waypoints: THREAT_PATROL_WAYPOINTS.map((p) => ({ ...p })),
      patrolIndex: threatPick.patrolIndex,
      searchTimer: 0,
      sniffTimer: 0,
      smashTimer: 0,
      roomInspectTimer: 0,
      lastInspectedZone: null,
      smashingDoorId: null,
      postSmashMode: 'patrol',
      headTilt: 0,
      headTwitch: 0,
      stepAccum: 0,
      hitCooldown: 0,
      alertFlash: 0,
      sawPlayerHideId: null,
      sawUnderTableId: null,
      checkingHideId: null,
    },
    doors: INITIAL_DOORS.map((d) => ({
      ...d,
      state: d.initialState,
      openProgress: 0,
    })),
    items: assignRandomizedItems(seed),
    shards: INITIAL_GLASS_SHARDS.map((s) => ({ ...s, collected: false })),
    throwables: INITIAL_THROWABLES.map((t) => ({ ...t, collected: false })),
    projectiles: [],
    nextProjectileId: 1,
    lore: INITIAL_LORE_ITEMS.map((l) => ({ ...l, inspected: false })),
    loreOverlay: null,
    loreOverlayTimer: 0,
    phones: INITIAL_ROTARY_PHONES.map((p) => ({ ...p, ringing: false, answeredCount: 0 })),
    paranoia: {
      noTurnTimer: 0,
      ghostFootstepsCooldown: 10,
      ghostFootstepsActive: false,
      ghostEyeFlashTimer: 0,
      ghostEyeX: 0,
      ghostEyeY: 0,
      ghostEyeZ: 0,
      mirrorHauntTimer: 0,
      mirrorHauntedId: null,
      mirrorLagYaw: spawnYaw,
      radioWhisperCooldown: 4,
      radioMessage: null,
      radioMessageTimer: 0,
      phoneRingCooldown: 18,
    },
    glasses: {
      active: false,
      activeTimer: 0,
      cooldownTimer: 0,
      shardsCollected: 0,
    },
    glassesCooldownMax: DEFAULT_SETTINGS.glassesCooldownSec,
    shifts: {
      cabin3PickupTaken: false,
      cabin3Sealed: false,
      cabin3SecretOpen: false,
      endlessLoopActive: false,
      endlessLoopSolved: false,
      phoneSpawned: false,
      midnightQuakeTriggered: false,
      dreamRoomTimer: 0,
      dreamLastDoorId: null,
      dreamShiftCount: 0,
      gridOverrides: wingOverrides,
    },
    knockables: INITIAL_KNOCKABLES.map((k) => ({ ...k, knocked: false })),
    inventory: [],
    selectedSlot: 0,
    roomsUnlocked: 0,
    itemsFound: 0,
    damageFlash: 0,
    statusBanner: null,
    statusBannerTimer: 0,
    echoRecord: opts.previousEcho ? { ...opts.previousEcho, inspected: false } : null,
    echoNoteText: null,
    echoNoteTimer: 0,
    phantomEcho: {
      active: false,
      x: 0,
      y: FLOOR2_Y,
      z: 0,
      startX: 11.5 * TILE_SIZE,
      startZ: 1.5 * TILE_SIZE,
      endX: 15.5 * TILE_SIZE,
      endZ: 1.5 * TILE_SIZE,
      progress: 0,
      cooldown: 16,
      yaw: -Math.PI / 2,
    },
    jumpscareTimer: 0,
    jumpscareProgress: 0,
    rebirthTimer: 0,
    rebirthProgress: 0,
    escapeTimer: 0,
    escaping: false,
    lastDeathReason: 'The Resident devoured you in the dark.',
    lockerCheckCooldown: 10,
    lastRoomZone: chosenSpawn.zone,
  };
}

export function isWallCell(
  col: number,
  row: number,
  floor: FloorIndex = 0,
  gridOverrides?: Readonly<Record<string, '#' | '.'>>
): boolean {
  if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) return true;
  if (gridOverrides) {
    const ov = gridOverrides[gridOverrideKey(floor, col, row)];
    if (ov !== undefined) return ov === '#';
  }
  return FLOOR_GRIDS[floor][row][col] === '#';
}

export function worldToGrid(x: number, z: number): { col: number; row: number } {
  return {
    col: Math.floor(x / TILE_SIZE),
    row: Math.floor(z / TILE_SIZE),
  };
}

export function gridToWorldCenter(col: number, row: number): { x: number; z: number } {
  return {
    x: (col + 0.5) * TILE_SIZE,
    z: (row + 0.5) * TILE_SIZE,
  };
}

export function isOnCreakyFloor(x: number, y: number, z: number): boolean {
  const floor = getFloorIndexFromY(y);
  for (const cf of CREAKY_FLOORS) {
    if (cf.floor === floor && x >= cf.minX && x <= cf.maxX && z >= cf.minZ && z <= cf.maxZ) {
      return true;
    }
  }
  return false;
}

export function getDoorBox(door: DoorRuntime): ObstacleBox {
  const minX = door.gridX * TILE_SIZE;
  const minZ = door.gridZ * TILE_SIZE;
  if (door.orientation === 'ns') {
    const cx = minX + TILE_SIZE * 0.5;
    return {
      id: door.id,
      floor: door.floor,
      minX: cx - 0.16,
      maxX: cx + 0.16,
      minZ,
      maxZ: minZ + door.widthTiles * TILE_SIZE,
      blocksSight: true,
    };
  }
  const cz = minZ + TILE_SIZE * 0.5;
  return {
    id: door.id,
    floor: door.floor,
    minX,
    maxX: minX + door.widthTiles * TILE_SIZE,
    minZ: cz - 0.16,
    maxZ: cz + 0.16,
    blocksSight: true,
  };
}

export function isDoorSolid(door: DoorRuntime): boolean {
  return door.state !== 'open' && door.openProgress < 0.7;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function pushCircleOutOfBox(
  pos: { x: number; z: number },
  radius: number,
  box: { minX: number; maxX: number; minZ: number; maxZ: number }
): void {
  const closestX = clamp(pos.x, box.minX, box.maxX);
  const closestZ = clamp(pos.z, box.minZ, box.maxZ);
  const dx = pos.x - closestX;
  const dz = pos.z - closestZ;
  const distSq = dx * dx + dz * dz;

  if (distSq >= radius * radius) return;

  if (distSq > 1e-8) {
    const dist = Math.sqrt(distSq);
    const overlap = radius - dist;
    pos.x += (dx / dist) * overlap;
    pos.z += (dz / dist) * overlap;
  } else {
    const leftPen = pos.x - box.minX;
    const rightPen = box.maxX - pos.x;
    const topPen = pos.z - box.minZ;
    const bottomPen = box.maxZ - pos.z;
    const minPen = Math.min(leftPen, rightPen, topPen, bottomPen);
    if (minPen === leftPen) pos.x = box.minX - radius;
    else if (minPen === rightPen) pos.x = box.maxX + radius;
    else if (minPen === topPen) pos.z = box.minZ - radius;
    else pos.z = box.maxZ + radius;
  }
}

export function resolveCircleMovement(
  startX: number,
  startY: number,
  startZ: number,
  dx: number,
  dz: number,
  radius: number,
  doors: readonly DoorRuntime[],
  includeFurniture = true,
  gridOverrides?: Readonly<Record<string, '#' | '.'>>,
  allowUnderTables = false
): { x: number; y: number; z: number } {
  const totalDist = Math.hypot(dx, dz);
  const steps = Math.max(1, Math.ceil(totalDist / (radius * 0.45)));
  const pos = { x: startX, y: startY, z: startZ };

  for (let s = 0; s < steps; s++) {
    pos.x += dx / steps;
    pos.z += dz / steps;
    pos.y = getSurfaceY(pos.x, pos.z, getFloorIndexFromY(pos.y));
    const activeFloor = getFloorIndexFromY(pos.y);

    // 1. Walls (3x3) on active floor (respecting Procedural + Dynamic Architecture Shifts)
    const cell = worldToGrid(pos.x, pos.z);
    for (let r = cell.row - 1; r <= cell.row + 1; r++) {
      for (let c = cell.col - 1; c <= cell.col + 1; c++) {
        if (isWallCell(c, r, activeFloor, gridOverrides)) {
          pushCircleOutOfBox(pos, radius, {
            minX: c * TILE_SIZE,
            maxX: (c + 1) * TILE_SIZE,
            minZ: r * TILE_SIZE,
            maxZ: (r + 1) * TILE_SIZE,
          });
        }
      }
    }

    // 2. Doors on active floor (skip sealed Cabin 3 door if already shifted to wall)
    for (let i = 0; i < doors.length; i++) {
      const door = doors[i];
      if (door.floor === activeFloor && isDoorSolid(door)) {
        if (gridOverrides && gridOverrides[gridOverrideKey(door.floor, door.gridX, door.gridZ)] === '#') {
          continue;
        }
        pushCircleOutOfBox(pos, radius, getDoorBox(door));
      }
    }

    // 3. Solid Furniture, Pillars, Boiler Tank, Bookshelves & Atrium Guardrails
    if (includeFurniture) {
      for (let i = 0; i < FURNITURE_OBSTACLES.length; i++) {
        const obs = FURNITURE_OBSTACLES[i];
        if (obs.floor === activeFloor) {
          pushCircleOutOfBox(pos, radius, obs);
        }
      }

      // Draped Hiding Tables: solid to standing player & Monster; crouching player slides underneath!
      if (!allowUnderTables) {
        for (let i = 0; i < HIDE_TABLES.length; i++) {
          const tbl = HIDE_TABLES[i];
          if (tbl.floor === activeFloor) {
            pushCircleOutOfBox(pos, radius, tbl);
          }
        }
      }
    }

    pos.y = getSurfaceY(pos.x, pos.z, getFloorIndexFromY(pos.y));
  }

  return pos;
}

export function hasLineOfSight(
  ax: number,
  ay: number,
  az: number,
  bx: number,
  by: number,
  bz: number,
  doors: readonly DoorRuntime[],
  gridOverrides?: Readonly<Record<string, '#' | '.'>>
): boolean {
  if (Math.abs(ay - by) > 2.2) return false;

  const activeFloor = getFloorIndexFromY((ay + by) * 0.5);
  const dx = bx - ax;
  const dz = bz - az;
  const dist = Math.hypot(dx, dz);
  if (dist < 0.05) return true;

  const stepSize = 0.24;
  const steps = Math.ceil(dist / stepSize);
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const px = ax + dx * t;
    const pz = az + dz * t;
    const { col, row } = worldToGrid(px, pz);
    if (isWallCell(col, row, activeFloor, gridOverrides)) return false;

    for (let d = 0; d < doors.length; d++) {
      const door = doors[d];
      if (door.floor !== activeFloor || !isDoorSolid(door)) continue;
      const box = getDoorBox(door);
      if (px >= box.minX && px <= box.maxX && pz >= box.minZ && pz <= box.maxZ) {
        return false;
      }
    }

    for (let f = 0; f < FURNITURE_OBSTACLES.length; f++) {
      const obs = FURNITURE_OBSTACLES[f];
      if (obs.floor === activeFloor && obs.blocksSight) {
        if (px >= obs.minX && px <= obs.maxX && pz >= obs.minZ && pz <= obs.maxZ) {
          return false;
        }
      }
    }
  }
  return true;
}

export function isGridCellPassableForAI(
  col: number,
  row: number,
  floor: FloorIndex,
  doors: readonly DoorRuntime[],
  gridOverrides?: Readonly<Record<string, '#' | '.'>>
): boolean {
  if (isWallCell(col, row, floor, gridOverrides)) return false;
  // Floor 2 Library Open Atrium Void is fenced — never route through open air!
  if (floor === 1 && isLibraryAtriumCell(col, row)) return false;

  for (let i = 0; i < doors.length; i++) {
    const door = doors[i];
    if (door.floor !== floor) continue;
    if (door.state === 'locked_key' || door.state === 'locked_exit') {
      if (
        col >= door.gridX &&
        col < door.gridX + (door.orientation === 'ew' ? door.widthTiles : 1) &&
        row >= door.gridZ &&
        row < door.gridZ + (door.orientation === 'ns' ? door.widthTiles : 1)
      ) {
        return false;
      }
    }
  }

  // Mark cells whose center is occupied by heavy solid obstacles so AI routes cleanly around them!
  const cx = (col + 0.5) * TILE_SIZE;
  const cz = (row + 0.5) * TILE_SIZE;
  for (let f = 0; f < FURNITURE_OBSTACLES.length; f++) {
    const obs = FURNITURE_OBSTACLES[f];
    if (obs.floor === floor && obs.blocksThreat && obs.id !== 'library_f2_stair_guard') {
      if (cx >= obs.minX && cx <= obs.maxX && cz >= obs.minZ && cz <= obs.maxZ) {
        return false;
      }
    }
  }
  for (let t = 0; t < HIDE_TABLES.length; t++) {
    const tbl = HIDE_TABLES[t];
    if (tbl.floor === floor) {
      if (cx >= tbl.minX && cx <= tbl.maxX && cz >= tbl.minZ && cz <= tbl.maxZ) {
        return false;
      }
    }
  }

  return true;
}

export function isStepBlockedByProps(
  fl: FloorIndex,
  fromCol: number,
  fromRow: number,
  toCol: number,
  toRow: number
): boolean {
  const ax = (fromCol + 0.5) * TILE_SIZE;
  const az = (fromRow + 0.5) * TILE_SIZE;
  const bx = (toCol + 0.5) * TILE_SIZE;
  const bz = (toRow + 0.5) * TILE_SIZE;
  const minSegX = Math.min(ax, bx) - 0.12;
  const maxSegX = Math.max(ax, bx) + 0.12;
  const minSegZ = Math.min(az, bz) - 0.12;
  const maxSegZ = Math.max(az, bz) + 0.12;

  for (let f = 0; f < FURNITURE_OBSTACLES.length; f++) {
    const obs = FURNITURE_OBSTACLES[f];
    if (obs.floor === fl && obs.blocksThreat) {
      if (maxSegX >= obs.minX && minSegX <= obs.maxX && maxSegZ >= obs.minZ && minSegZ <= obs.maxZ) {
        return true;
      }
    }
  }
  for (let t = 0; t < HIDE_TABLES.length; t++) {
    const tbl = HIDE_TABLES[t];
    if (tbl.floor === fl) {
      if (maxSegX >= tbl.minX && minSegX <= tbl.maxX && maxSegZ >= tbl.minZ && minSegZ <= tbl.maxZ) {
        return true;
      }
    }
  }
  return false;
}

/**
 * 3D Multi-Floor BFS across Floor 1 & Floor 2 connected via:
 * - Main Wooden Staircase (11, 7)
 * - West Service / Cellar Staircase (2, 10)
 * - Library Grand Staircase (21, 13)
 * Dynamically honors sim.shifts.gridOverrides & solid props (< 0.2ms on 2*23*23 = 1,058 nodes).
 */
export function findNextGridStep(
  fromX: number,
  fromY: number,
  fromZ: number,
  toX: number,
  toY: number,
  toZ: number,
  doors: readonly DoorRuntime[],
  gridOverrides?: Readonly<Record<string, '#' | '.'>>
): { x: number; y: number; z: number; reachable: boolean } {
  const startFloor = getFloorIndexFromY(fromY);
  const goalFloor = getFloorIndexFromY(toY);
  const start = worldToGrid(fromX, fromZ);
  const goal = worldToGrid(toX, toZ);

  if (startFloor === goalFloor && start.col === goal.col && start.row === goal.row) {
    return { x: toX, y: toY, z: toZ, reachable: true };
  }

  const cellsPerFloor = GRID_COLS * GRID_ROWS;
  const total = 2 * cellsPerFloor;
  const visited = new Uint8Array(total);
  const parent = new Int16Array(total).fill(-1);
  const queue = new Int16Array(total);

  const encode = (fl: FloorIndex, c: number, r: number) => fl * cellsPerFloor + r * GRID_COLS + c;
  const startIdx = encode(startFloor, start.col, start.row);
  const goalIdx = encode(goalFloor, goal.col, goal.row);

  visited[startIdx] = 1;
  let head = 0;
  let tail = 0;
  queue[tail++] = startIdx;

  const dirs = [
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0],
  ];

  let found = false;
  while (head < tail) {
    const cur = queue[head++];
    if (cur === goalIdx) {
      found = true;
      break;
    }

    const fl: FloorIndex = cur >= cellsPerFloor ? 1 : 0;
    const rem = cur % cellsPerFloor;
    const cc = rem % GRID_COLS;
    const cr = Math.floor(rem / GRID_COLS);

    const tryPush = (nfl: FloorIndex, nc: number, nr: number) => {
      if (nc < 0 || nc >= GRID_COLS || nr < 0 || nr >= GRID_ROWS) return;
      const nIdx = encode(nfl, nc, nr);
      if (visited[nIdx]) return;
      if (nIdx !== goalIdx) {
        if (!isGridCellPassableForAI(nc, nr, nfl, doors, gridOverrides)) return;
        if (nfl === fl && isStepBlockedByProps(fl, cc, cr, nc, nr)) return;
      }
      visited[nIdx] = 1;
      parent[nIdx] = cur;
      queue[tail++] = nIdx;
    };

    for (let d = 0; d < 4; d++) {
      tryPush(fl, cc + dirs[d][0], cr + dirs[d][1]);
    }

    // 3 Vertical Staircase Portals linking Floor 0 <-> Floor 1
    if ((cc === 11 && cr === 7) || (cc === 2 && cr === 10) || (cc === 21 && cr === 13)) {
      const otherFloor: FloorIndex = fl === 0 ? 1 : 0;
      tryPush(otherFloor, cc, cr);
    }
  }

  if (!found) {
    return { x: toX, y: toY, z: toZ, reachable: false };
  }

  const path: number[] = [];
  let trace = goalIdx;
  while (trace !== -1) {
    path.push(trace);
    trace = parent[trace];
  }
  path.reverse();

  let chosenIdx = path[path.length - 1];
  for (let i = 1; i < path.length; i++) {
    const idx = path[i];
    const rem = idx % cellsPerFloor;
    const c = rem % GRID_COLS;
    const r = Math.floor(rem / GRID_COLS);
    if (c !== start.col || r !== start.row) {
      chosenIdx = idx;
      break;
    }
  }

  const sFl: FloorIndex = chosenIdx >= cellsPerFloor ? 1 : 0;
  const sRem = chosenIdx % cellsPerFloor;
  const sc = sRem % GRID_COLS;
  const sr = Math.floor(sRem / GRID_COLS);
  const center = gridToWorldCenter(sc, sr);
  return {
    x: center.x,
    y: getSurfaceY(center.x, center.z, sFl),
    z: center.z,
    reachable: true,
  };
}

export function findBestInteraction(sim: SimulationState): InteractionTarget | null {
  const { player, items, shards, throwables, lore, phones, doors, inventory, echoRecord, shifts } =
    sim;

  if (player.hidingSpotId) {
    const spot = HIDE_SPOTS.find((h) => h.id === player.hidingSpotId);
    return {
      kind: 'hide',
      spotId: player.hidingSpotId,
      label: spot?.kind === 'bed' ? 'Crawl Out' : 'Exit Locker',
      actionable: true,
    };
  }

  const forwardX = -Math.sin(player.yaw);
  const forwardZ = -Math.cos(player.yaw);

  let bestScore = Infinity;
  let best: InteractionTarget | null = null;

  const hasWallBetween = (tx: number, ty: number, tz: number): boolean => {
    const dx = tx - player.x;
    const dz = tz - player.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.4) return false;
    const activeFloor = getFloorIndexFromY((player.y + ty) * 0.5);
    const steps = Math.ceil(dist / 0.25);
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const { col, row } = worldToGrid(player.x + dx * t, player.z + dz * t);
      if (isWallCell(col, row, activeFloor, shifts.gridOverrides)) return true;
    }
    return false;
  };

  const scoreTarget = (tx: number, ty: number, tz: number, maxRange: number): number | null => {
    if (Math.abs(ty - player.y) > 1.85) return null;
    const dx = tx - player.x;
    const dz = tz - player.z;
    const dist = Math.hypot(dx, dz);
    if (dist > maxRange || dist < 0.01) return null;
    const dot = (dx / dist) * forwardX + (dz / dist) * forwardZ;
    if (dot < 0.36 && dist > 1.2) return null;
    if (hasWallBetween(tx, ty, tz)) return null;
    return dist - dot * 0.8;
  };

  // 1. Uncollected Puzzle Items
  for (const item of items) {
    if (item.collected) continue;
    const score = scoreTarget(item.x, item.y, item.z, INTERACT_RANGE);
    if (score !== null && score < bestScore) {
      bestScore = score;
      const meta = ITEM_CATALOG[item.id];
      best = {
        kind: 'item',
        item,
        label: `Pick up ${meta.name}`,
        actionable: true,
      };
    }
  }

  // 1b. Collectible Glass Shards
  for (const shard of shards) {
    if (shard.collected) continue;
    const score = scoreTarget(shard.x, shard.y, shard.z, INTERACT_RANGE);
    if (score !== null && score < bestScore) {
      bestScore = score;
      best = {
        kind: 'shard',
        shard,
        label: 'Collect Glass Shard (Recharge Spectral Vision)',
        actionable: true,
      };
    }
  }

  // 1c. Throwable Bottles & Cans
  for (const pickup of throwables) {
    if (pickup.collected) continue;
    const score = scoreTarget(pickup.x, pickup.y, pickup.z, INTERACT_RANGE);
    if (score !== null && score < bestScore) {
      bestScore = score;
      best = {
        kind: 'throwable',
        pickup,
        label: `Pick up ${pickup.label} (Throw [F])`,
        actionable: true,
      };
    }
  }

  // 1d. Rotary Phones (Ringing or Ambient)
  for (const phone of phones) {
    if (phone.isLoopTrigger && !shifts.endlessLoopActive) continue;
    const score = scoreTarget(phone.x, phone.y, phone.z, INTERACT_RANGE + 0.3);
    if (score !== null && score < bestScore) {
      bestScore = score;
      best = {
        kind: 'phone',
        phone,
        label: phone.ringing
          ? 'Answer Ringing Rotary Phone'
          : 'Inspect Rotary Telephone',
        actionable: true,
      };
    }
  }

  // 1e. Lore Collectibles (Diaries, Backwards Watches, Polaroids)
  for (const entry of lore) {
    const score = scoreTarget(entry.x, entry.y, entry.z, INTERACT_RANGE);
    if (score !== null && score < bestScore) {
      bestScore = score;
      best = {
        kind: 'lore',
        lore: entry,
        label: entry.inspected ? `Re-read ${entry.title}` : `Inspect ${entry.title}`,
        actionable: true,
      };
    }
  }

  // 2. Previous Loop Echo Corpse
  if (echoRecord && !echoRecord.inspected) {
    const score = scoreTarget(echoRecord.deathX, echoRecord.deathY, echoRecord.deathZ, INTERACT_RANGE);
    if (score !== null && score < bestScore) {
      bestScore = score;
      best = {
        kind: 'echo',
        label: `Inspect Your Past Body (Loop #${echoRecord.loopNumber})`,
        actionable: true,
      };
    }
  }

  // 3. Steam Valve Socket in Floor 1 Boiler Utility
  if (!sim.steamShutOff) {
    const score = scoreTarget(STEAM_VALVE_POS.x, STEAM_VALVE_POS.y, STEAM_VALVE_POS.z, INTERACT_RANGE + 0.2);
    if (score !== null && score < bestScore) {
      bestScore = score;
      const hasValve = inventory.includes('valve_wheel');
      best = {
        kind: 'valve',
        label: hasValve ? 'Attach & Turn Steam Valve' : 'Steam Pipe Socket (Needs Valve Wheel)',
        actionable: hasValve,
      };
    }
  }

  // 4. Boiler Breaker Box
  if (!sim.powerRestored) {
    const score = scoreTarget(BREAKER_BOX_POS.x, BREAKER_BOX_POS.y, BREAKER_BOX_POS.z, INTERACT_RANGE + 0.3);
    if (score !== null && score < bestScore) {
      bestScore = score;
      const hasFuse = inventory.includes('power_fuse');
      if (!sim.steamShutOff) {
        best = {
          kind: 'breaker',
          label: 'Breaker Blocked by Scalding Steam (Shut Valve First)',
          actionable: false,
        };
      } else {
        best = {
          kind: 'breaker',
          label: hasFuse ? 'Insert High-Volt Fuse' : 'Main Breaker (Needs Fuse)',
          actionable: hasFuse,
        };
      }
    }
  }

  // 5. Doors (skip sealed Cabin 3 door!)
  for (const door of doors) {
    if (shifts.gridOverrides[gridOverrideKey(door.floor, door.gridX, door.gridZ)] === '#') {
      continue;
    }
    const doorY = door.floor === 1 ? FLOOR2_Y : 0;
    const cx = (door.gridX + (door.orientation === 'ew' ? door.widthTiles * 0.5 : 0.5)) * TILE_SIZE;
    const cz = (door.gridZ + (door.orientation === 'ns' ? door.widthTiles * 0.5 : 0.5)) * TILE_SIZE;
    const score = scoreTarget(cx, doorY, cz, INTERACT_RANGE + 0.25);
    if (score !== null && score < bestScore) {
      bestScore = score;
      if (door.state === 'open') {
        if (door.id === 'exit_doors') continue;
        best = { kind: 'door', door, label: `Close ${door.label}`, actionable: true };
      } else if (door.state === 'closed') {
        best = { kind: 'door', door, label: `Open ${door.label}`, actionable: true };
      } else if (door.state === 'locked_key') {
        const hasKey = inventory.includes('ward_key');
        best = {
          kind: 'door',
          door,
          label: hasKey ? `Unlock ${door.label}` : `${door.label} (Needs Security Room Key)`,
          actionable: hasKey,
        };
      } else if (door.state === 'locked_exit') {
        const hasCutters = inventory.includes('bolt_cutters');
        if (!sim.powerRestored && !hasCutters) {
          best = {
            kind: 'door',
            door,
            label: 'Exit Sealed (Needs Boiler Power & Bolt Cutters)',
            actionable: false,
          };
        } else if (!sim.powerRestored) {
          best = {
            kind: 'door',
            door,
            label: 'Exit Unpowered (Restore Boiler Breaker)',
            actionable: false,
          };
        } else if (!hasCutters) {
          best = {
            kind: 'door',
            door,
            label: 'Exit Chained (Needs Heavy Bolt Cutters)',
            actionable: false,
          };
        } else {
          best = {
            kind: 'door',
            door,
            label: 'Cut Exit Chains & Escape',
            actionable: true,
          };
        }
      }
    }
  }

  // 6. Hiding Spots
  for (const spot of HIDE_SPOTS) {
    const score = scoreTarget(spot.x, spot.y, spot.z, INTERACT_RANGE);
    if (score !== null && score < bestScore) {
      bestScore = score;
      best = {
        kind: 'hide',
        spotId: spot.id,
        label: `Hide: ${spot.label}`,
        actionable: true,
      };
    }
  }

  return best;
}

export function performInteraction(sim: SimulationState, events: StepEvents): void {
  const target = findBestInteraction(sim);
  if (!target) return;

  if (target.kind === 'item') {
    target.item.collected = true;
    sim.inventory.push(target.item.id);
    sim.selectedSlot = sim.inventory.length - 1;
    sim.itemsFound += 1;
    const meta = ITEM_CATALOG[target.item.id];
    sim.statusBanner = `Picked up ${meta.name}`;
    sim.statusBannerTimer = 2.5;
    events.pickup = target.item.id;
    return;
  }

  if (target.kind === 'shard') {
    target.shard.collected = true;
    sim.glasses.shardsCollected += 1;
    sim.glasses.cooldownTimer = 0;
    if (target.shard.zone === 'cabin_3') {
      sim.shifts.cabin3PickupTaken = true;
    }
    sim.statusBanner = 'Glass Shard Collected — Spectral Glasses Recharged!';
    sim.statusBannerTimer = 2.8;
    events.shardPickup = true;
    return;
  }

  if (target.kind === 'throwable') {
    target.pickup.collected = true;
    sim.player.bottlesCount += 1;
    sim.statusBanner = `${target.pickup.label} added (Press [F] or Right-Click to throw)`;
    sim.statusBannerTimer = 2.4;
    events.throwablePickup = true;
    return;
  }

  if (target.kind === 'lore') {
    target.lore.inspected = true;
    sim.loreOverlay = {
      title: target.lore.title,
      kind: target.lore.kind,
      text: target.lore.text,
    };
    sim.loreOverlayTimer = 6.2;
    sim.statusBanner = `Read: ${target.lore.title}`;
    sim.statusBannerTimer = 2.6;
    events.loreInspected = true;
    return;
  }

  if (target.kind === 'phone') {
    const phone = target.phone;
    phone.ringing = false;
    phone.answeredCount += 1;
    events.phoneAnswered = true;

    if (phone.isLoopTrigger && sim.shifts.endlessLoopActive && !sim.shifts.endlessLoopSolved) {
      sim.shifts.endlessLoopSolved = true;
      sim.shifts.endlessLoopActive = false;
      sim.shifts.gridOverrides[
        gridOverrideKey(
          ENDLESS_CORRIDOR_BOUNDS.floor,
          ENDLESS_CORRIDOR_BOUNDS.shiftingWallGridX,
          ENDLESS_CORRIDOR_BOUNDS.shiftingWallGridZ
        )
      ] = '.';
      sim.paranoia.radioMessage = '"Turn around... the hallway behind you opened."';
      sim.paranoia.radioMessageTimer = 3.6;
      sim.statusBanner = '"Turn around..." — The hallway shifts open behind you!';
      sim.statusBannerTimer = 3.4;
      events.architectureShift = 'phone_loop_broken';
      events.doorUnlocked = true;
    } else {
      const tZone = getZoneAt(sim.threat.x, sim.threat.y, sim.threat.z).replace('_', ' ');
      const tFloor = getFloorIndexFromY(sim.threat.y) === 1 ? 'Floor 2' : 'Floor 1';
      sim.paranoia.radioMessage = `"Receiver crackles: She is prowling ${tFloor} (${tZone})..."`;
      sim.paranoia.radioMessageTimer = 3.5;
      sim.statusBanner = `Static on the line: She is near ${tFloor} ${tZone}...`;
      sim.statusBannerTimer = 3.0;
    }
    return;
  }

  if (target.kind === 'echo' && sim.echoRecord) {
    sim.echoRecord.inspected = true;
    sim.player.stamina = Math.min(100, sim.player.stamina + 35);
    sim.player.battery = Math.min(100, sim.player.battery + 35);
    sim.echoNoteText = sim.echoRecord.noteText;
    sim.echoNoteTimer = 5.5;
    sim.statusBanner = 'Recovered Past Body Note (+35 Stamina & Battery)';
    sim.statusBannerTimer = 2.6;
    events.echoInspected = true;
    return;
  }

  if (target.kind === 'valve') {
    if (sim.inventory.includes('valve_wheel')) {
      sim.steamShutOff = true;
      sim.inventory = sim.inventory.filter((id) => id !== 'valve_wheel');
      sim.selectedSlot = Math.max(0, Math.min(sim.selectedSlot, sim.inventory.length - 1));
      sim.statusBanner = 'Steam Pipe Shut Off — Breaker Accessible';
      sim.statusBannerTimer = 2.8;
      sim.player.noiseLevel = Math.max(sim.player.noiseLevel, 0.72);
      events.steamShutOff = true;
    } else {
      sim.statusBanner = 'Missing Cast-Iron Valve Wheel';
      sim.statusBannerTimer = 2.2;
      events.doorLockedRattle = true;
    }
    return;
  }

  if (target.kind === 'breaker') {
    if (!sim.steamShutOff) {
      sim.statusBanner = 'Scalding Steam — Shut Off Valve First';
      sim.statusBannerTimer = 2.4;
      events.doorLockedRattle = true;
      return;
    }
    if (sim.inventory.includes('power_fuse')) {
      sim.powerRestored = true;
      sim.inventory = sim.inventory.filter((id) => id !== 'power_fuse');
      sim.selectedSlot = Math.max(0, Math.min(sim.selectedSlot, sim.inventory.length - 1));
      sim.player.noiseLevel = Math.max(sim.player.noiseLevel, 0.9);
      events.breakerRestored = true;

      if (!sim.shifts.midnightQuakeTriggered) {
        sim.shifts.midnightQuakeTriggered = true;
        sim.shifts.gridOverrides[gridOverrideKey(0, 6, 6)] = '#';
        sim.shifts.gridOverrides[gridOverrideKey(0, 11, 9)] = '#';
        sim.shifts.gridOverrides[gridOverrideKey(1, 11, 5)] = '#';
        sim.shifts.gridOverrides[gridOverrideKey(0, 2, 7)] = '.';
        sim.shifts.gridOverrides[gridOverrideKey(0, 4, 12)] = '.';
        events.midnightQuake = true;
        events.architectureShift = 'midnight_quake';
        sim.statusBanner = 'MIDNIGHT QUAKE — Main Stairs collapsed! Escape via West Cellar!';
        sim.statusBannerTimer = 4.2;
      } else {
        sim.statusBanner = 'Emergency Power Restored to Entrance Exit';
        sim.statusBannerTimer = 3.0;
      }
    } else {
      sim.statusBanner = 'Breaker Missing High-Volt Fuse';
      sim.statusBannerTimer = 2.2;
      events.doorLockedRattle = true;
    }
    return;
  }

  if (target.kind === 'hide') {
    if (sim.player.hidingSpotId) {
      const spot = HIDE_SPOTS.find((l) => l.id === sim.player.hidingSpotId);
      sim.player.hidingSpotId = null;
      if (spot) {
        const outX = spot.x - Math.sin(spot.facingAngle) * 1.1;
        const outZ = spot.z - Math.cos(spot.facingAngle) * 1.1;
        const safe = resolveCircleMovement(
          outX,
          spot.y,
          outZ,
          0,
          0,
          PLAYER_RADIUS,
          sim.doors,
          true,
          sim.shifts.gridOverrides,
          spot.kind === 'bed'
        );
        sim.player.x = safe.x;
        sim.player.y = spot.y;
        sim.player.z = safe.z;
        sim.player.yaw = spot.facingAngle;
        sim.player.crouching = spot.kind === 'bed';
      }
      events.hideToggle = true;
    } else {
      const spot = HIDE_SPOTS.find((l) => l.id === target.spotId);
      if (spot) {
        const dist = Math.hypot(sim.player.x - sim.threat.x, sim.player.z - sim.threat.z);
        const seenEntering =
          dist <= THREAT_SIGHT_RANGE &&
          hasLineOfSight(
            sim.threat.x,
            sim.threat.y,
            sim.threat.z,
            sim.player.x,
            sim.player.y,
            sim.player.z,
            sim.doors,
            sim.shifts.gridOverrides
          );

        sim.player.hidingSpotId = spot.id;
        sim.player.crouching = false;
        sim.player.isUnderTable = false;
        sim.player.underTableId = null;
        sim.player.sprinting = false;
        sim.player.x = spot.x;
        sim.player.y = spot.y;
        sim.player.z = spot.z;
        sim.player.yaw = spot.facingAngle;
        sim.player.pitch = 0;
        if (seenEntering) {
          sim.threat.sawPlayerHideId = spot.id;
          sim.threat.mode = 'chase';
          sim.threat.targetX = spot.x;
          sim.threat.targetY = spot.y;
          sim.threat.targetZ = spot.z;
        }
        events.hideToggle = true;
      }
    }
    return;
  }

  if (target.kind === 'door') {
    const door = target.door;
    sim.shifts.dreamLastDoorId = door.id;
    if (door.state === 'open') {
      door.state = 'closed';
      sim.shifts.dreamRoomTimer = 0;
      sim.player.noiseLevel = Math.max(sim.player.noiseLevel, 0.25);
      events.doorOpened = true;
    } else if (door.state === 'closed') {
      door.state = 'open';
      const isSlam = sim.player.sprinting;
      sim.player.noiseLevel = Math.max(sim.player.noiseLevel, isSlam ? 0.95 : 0.28);
      if (isSlam) events.doorSlammed = true;
      else events.doorOpened = true;
    } else if (door.state === 'locked_key') {
      if (sim.inventory.includes('ward_key')) {
        door.state = 'open';
        sim.inventory = sim.inventory.filter((id) => id !== 'ward_key');
        sim.selectedSlot = Math.max(0, Math.min(sim.selectedSlot, sim.inventory.length - 1));
        sim.roomsUnlocked += 1;
        sim.statusBanner = 'Unlocked Security Storage Room';
        sim.statusBannerTimer = 2.6;
        sim.player.noiseLevel = Math.max(sim.player.noiseLevel, 0.55);
        events.doorUnlocked = true;
      } else {
        sim.statusBanner = 'Locked — Find Security Room Key';
        sim.statusBannerTimer = 2.2;
        events.doorLockedRattle = true;
      }
    } else if (door.state === 'locked_exit') {
      if (sim.powerRestored && sim.inventory.includes('bolt_cutters')) {
        door.state = 'open';
        sim.roomsUnlocked += 1;
        sim.escaping = true;
        sim.escapeTimer = 0.5;
        sim.statusBanner = 'Chains Cut — Escaping Estate!';
        sim.statusBannerTimer = 3.0;
        events.doorUnlocked = true;
      } else if (!sim.powerRestored) {
        sim.statusBanner = 'No Power — Restore Boiler Breaker on Floor 1';
        sim.statusBannerTimer = 2.6;
        events.doorLockedRattle = true;
      } else {
        sim.statusBanner = 'Exit Chained — Find Heavy Bolt Cutters';
        sim.statusBannerTimer = 2.6;
        events.doorLockedRattle = true;
      }
    }
  }
}

export function computeObjectiveText(sim: SimulationState): string {
  const hasWardKey = sim.inventory.includes('ward_key');
  const hasValve = sim.inventory.includes('valve_wheel');
  const hasFuse = sim.inventory.includes('power_fuse');
  const hasCutters = sim.inventory.includes('bolt_cutters');

  if (sim.shifts.endlessLoopActive && !sim.shifts.endlessLoopSolved) {
    return 'A rotary telephone rings inside the endless hall — answer it to break the loop';
  }
  if (sim.powerRestored && hasCutters) {
    return 'Cut the chains on the Floor 1 Entrance Exit Door and escape';
  }
  if (!sim.steamShutOff && hasValve) {
    return 'Shut off the Boiler Steam Valve in NW Floor 1 Boiler Utility';
  }
  if (sim.steamShutOff && !sim.powerRestored && hasFuse) {
    return 'Insert the High-Volt Fuse into the Boiler Main Breaker';
  }
  const secDoor = sim.doors.find((d) => d.id === 'security_door');
  if (secDoor && secDoor.state !== 'open' && hasWardKey) {
    return 'Unlock the Security Storage Room in SE Floor 1';
  }
  if (!sim.powerRestored) {
    return 'Search the Ballroom, Library & Cabins for the Valve, Fuse & Cutters';
  }
  return 'Find the Heavy Bolt Cutters to cut the Entrance Exit chains';
}

function triggerPlayerStrike(sim: SimulationState, events: StepEvents, reason: string): void {
  const { player, threat } = sim;
  player.strikesRemaining = 0;
  sim.damageFlash = 1.0;
  threat.hitCooldown = 3.0;
  player.invulnTimer = 2.6;
  sim.lastDeathReason = reason;
  events.playerHit = true;

  // Instant 1-Hit Lethal Devour Jumpscare
  sim.phase = 'jumpscare';
  sim.jumpscareTimer = JUMPSCARE_DURATION;
  sim.jumpscareProgress = 0;
  sim.statusBanner = null;
  sim.loreOverlay = null;
  events.jumpscareStarted = true;
}

export function rebirthFromLoop(sim: SimulationState, events: StepEvents): void {
  const deathZone = getZoneAt(sim.player.x, sim.player.y, sim.player.z);
  sim.echoRecord = {
    loopNumber: sim.loopCount,
    deathX: sim.player.x,
    deathY: sim.player.y,
    deathZ: sim.player.z,
    noteText: `Loop #${sim.loopCount}: Killed near ${deathZone.replace('_', ' ')}. Every time I fall, I wake in another bed with everything I carried.`,
    inspected: false,
  };

  sim.loopCount += 1;
  sim.phase = 'playing';
  sim.rebirthTimer = 0;
  sim.rebirthProgress = 0;
  sim.jumpscareTimer = 0;
  sim.jumpscareProgress = 0;
  sim.damageFlash = 0;

  // Deterministic + cycle-rotated randomized spawn point
  const rng = makeRng(sim.seed + sim.loopCount * 997);
  const spawnIdx = Math.floor(rng() * RANDOM_SPAWN_POINTS.length);
  const sp = RANDOM_SPAWN_POINTS[spawnIdx];

  sim.player.x = sp.x;
  sim.player.y = sp.y;
  sim.player.z = sp.z;
  sim.player.yaw = (rng() * Math.PI * 2) - Math.PI;
  sim.player.pitch = 0;
  sim.player.crouching = false;
  sim.player.isUnderTable = false;
  sim.player.underTableId = null;
  sim.player.sprinting = false;
  sim.player.hidingSpotId = null;
  sim.player.stamina = 100;
  sim.player.battery = Math.max(sim.player.battery, 75);
  sim.player.flashlightOn = true;
  sim.player.strikesRemaining = 1;
  sim.player.invulnTimer = 2.4;
  sim.player.noiseLevel = 0;

  // Relocate Threat > 19.5m away on patrol
  const threatPick = pickDistantThreatWaypoint(sp.x, sp.z, sim.seed + sim.loopCount * 131);
  sim.threat.x = threatPick.spawn.x;
  sim.threat.y = threatPick.spawn.y;
  sim.threat.z = threatPick.spawn.z;
  sim.threat.mode = 'patrol';
  sim.threat.patrolIndex = threatPick.patrolIndex;
  const wp = THREAT_PATROL_WAYPOINTS[threatPick.patrolIndex];
  sim.threat.targetX = wp.x;
  sim.threat.targetY = wp.y;
  sim.threat.targetZ = wp.z;
  sim.threat.sawPlayerHideId = null;
  sim.threat.sawUnderTableId = null;
  sim.threat.hitCooldown = 2.5;
  sim.threat.headTilt = 0;

  sim.statusBanner = `Loop #${sim.loopCount} — You wake gasping in ${sp.zone.replace('_', ' ')}. Progress preserved.`;
  sim.statusBannerTimer = 3.6;
  events.rebirthCompleted = true;
}

function throwBottleOrCan(sim: SimulationState, events: StepEvents): void {
  const { player } = sim;
  if (player.hidingSpotId || player.bottlesCount <= 0) return;

  player.bottlesCount -= 1;
  const fwdX = -Math.sin(player.yaw);
  const fwdZ = -Math.cos(player.yaw);
  const cosPitch = Math.cos(player.pitch);
  const sinPitch = Math.sin(player.pitch);

  const eyeY = player.y + (player.isUnderTable ? 0.58 : player.crouching ? 0.96 : 1.52);
  const speedHoriz = Math.max(3.5, cosPitch * 11.5);

  sim.projectiles.push({
    id: sim.nextProjectileId++,
    kind: player.bottlesCount % 2 === 0 ? 'bottle' : 'can',
    x: player.x + fwdX * 0.45,
    y: eyeY - 0.08,
    z: player.z + fwdZ * 0.45,
    vx: fwdX * speedHoriz,
    vy: 2.8 + sinPitch * 6.5,
    vz: fwdZ * speedHoriz,
    floor: getFloorIndexFromY(player.y),
  });
  events.bottleThrown = true;
}

function stepProjectiles(sim: SimulationState, dt: number, events: StepEvents): void {
  if (sim.projectiles.length === 0) return;
  const remaining: ThrownProjectile[] = [];

  for (const proj of sim.projectiles) {
    const nextX = proj.x + proj.vx * dt;
    const nextZ = proj.z + proj.vz * dt;
    proj.vy -= 15.0 * dt;
    const nextY = proj.y + proj.vy * dt;

    const floorY = proj.floor === 1 ? FLOOR2_Y : 0;
    const cell = worldToGrid(nextX, nextZ);
    const hitWall = isWallCell(cell.col, cell.row, proj.floor, sim.shifts.gridOverrides);
    const hitDoor = sim.doors.some((d) => {
      if (d.floor !== proj.floor || !isDoorSolid(d)) return false;
      const box = getDoorBox(d);
      return nextX >= box.minX && nextX <= box.maxX && nextZ >= box.minZ && nextZ <= box.maxZ;
    });

    if (nextY <= floorY + 0.08 || hitWall || hitDoor) {
      const impactX = hitWall || hitDoor ? proj.x : nextX;
      const impactZ = hitWall || hitDoor ? proj.z : nextZ;
      events.bottleShattered = {
        x: impactX,
        y: floorY,
        z: impactZ,
        floor: proj.floor,
      };
      sim.statusBanner = 'Glass Shattered! The Resident is drawn to the noise!';
      sim.statusBannerTimer = 2.4;

      // Divert Resident within 34m toward the shatter site unless actively staring at player
      const distToThreat = Math.hypot(impactX - sim.threat.x, impactZ - sim.threat.z);
      if (distToThreat <= 34.0) {
        sim.threat.mode = 'investigate';
        sim.threat.targetX = impactX;
        sim.threat.targetY = floorY;
        sim.threat.targetZ = impactZ;
        sim.threat.searchTimer = 6.0;
        sim.threat.alertFlash = 0.9;
        sim.threat.sawPlayerHideId = null;
        sim.threat.sawUnderTableId = null;
        events.threatSniff = true;
      }
    } else {
      proj.x = nextX;
      proj.y = nextY;
      proj.z = nextZ;
      remaining.push(proj);
    }
  }

  sim.projectiles = remaining;
}

function stepThreatAI(
  sim: SimulationState,
  dt: number,
  events: StepEvents,
  speedMult: number
): void {
  const { threat, player, doors, shifts } = sim;

  if (threat.hitCooldown > 0) threat.hitCooldown = Math.max(0, threat.hitCooldown - dt);
  if (threat.alertFlash > 0) threat.alertFlash = Math.max(0, threat.alertFlash - dt);
  if (sim.lockerCheckCooldown > 0) sim.lockerCheckCooldown = Math.max(0, sim.lockerCheckCooldown - dt);

  const distToPlayer = Math.hypot(player.x - threat.x, player.z - threat.z);
  const rawLos =
    !player.hidingSpotId &&
    player.invulnTimer <= 0 &&
    distToPlayer <= THREAT_SIGHT_RANGE &&
    hasLineOfSight(
      threat.x,
      threat.y,
      threat.z,
      player.x,
      player.y,
      player.z,
      doors,
      shifts.gridOverrides
    );

  // Under-table stealth check:
  // If player is under a table, Resident IGNORES them unless she is in active Chase AND saw them go under it!
  if (player.isUnderTable && threat.mode === 'chase' && rawLos && !threat.sawUnderTableId) {
    // Only mark sawUnderTableId if Resident already had Chase sight within 9m
    if (distToPlayer < 9.5) {
      threat.sawUnderTableId = player.underTableId;
    }
  }
  if (!player.isUnderTable && threat.mode !== 'chase') {
    threat.sawUnderTableId = null;
  }

  const concealedUnderTable =
    player.isUnderTable && !(threat.mode === 'chase' && threat.sawUnderTableId === player.underTableId);

  const playerVisible = rawLos && !concealedUnderTable;

  const hearingRadius = player.noiseLevel > 0.72 ? 20.0 : player.noiseLevel > 0.4 ? 11.0 : 0;

  if (playerVisible && threat.mode !== 'smash_door') {
    if (threat.mode !== 'chase') {
      threat.alertFlash = 1.0;
      events.threatAlerted = true;
    }
    threat.mode = 'chase';
    threat.targetX = player.x;
    threat.targetY = player.y;
    threat.targetZ = player.z;
    threat.searchTimer = 4.5;
    threat.headTilt = 0;
  } else if (
    hearingRadius > 0 &&
    distToPlayer <= hearingRadius &&
    !player.hidingSpotId &&
    !concealedUnderTable &&
    threat.mode !== 'chase' &&
    threat.mode !== 'smash_door'
  ) {
    if (threat.mode === 'patrol' || threat.mode === 'search' || threat.mode === 'inspect_room') {
      threat.mode = 'sniff';
      threat.sniffTimer = 0.85;
      threat.alertFlash = 0.75;
      events.threatSniff = true;
    }
    threat.targetX = player.x;
    threat.targetY = player.y;
    threat.targetZ = player.z;
    threat.searchTimer = 4.0;
  }

  // If Resident saw player enter a hiding spot, rush it and tear it open!
  if (threat.sawPlayerHideId && player.hidingSpotId === threat.sawPlayerHideId) {
    const spot = HIDE_SPOTS.find((h) => h.id === threat.sawPlayerHideId);
    if (spot) {
      if (threat.mode !== 'smash_door') {
        threat.mode = 'chase';
      }
      threat.targetX = spot.x;
      threat.targetY = spot.y;
      threat.targetZ = spot.z;
      if (
        Math.abs(spot.y - threat.y) < 1.5 &&
        Math.hypot(spot.x - threat.x, spot.z - threat.z) <= 1.5
      ) {
        player.hidingSpotId = null;
        threat.sawPlayerHideId = null;
        const outX = spot.x - Math.sin(spot.facingAngle) * 1.05;
        const outZ = spot.z - Math.cos(spot.facingAngle) * 1.05;
        player.x = outX;
        player.y = spot.y;
        player.z = outZ;
        events.lockerTornOpen = true;
        triggerPlayerStrike(sim, events, 'She saw you slip inside the hiding spot.');
        return;
      }
    }
  } else {
    threat.sawPlayerHideId = null;
  }

  // Handle 'smash_door' 2-second pause
  if (threat.mode === 'smash_door') {
    const door = doors.find((d) => d.id === threat.smashingDoorId);
    if (!door || door.state === 'open') {
      threat.mode = threat.postSmashMode;
      threat.smashingDoorId = null;
      return;
    }
    const prevTimer = threat.smashTimer;
    threat.smashTimer -= dt;
    threat.headTilt = Math.sin(threat.smashTimer * 18) * 0.25;
    if (prevTimer > 1.0 && threat.smashTimer <= 1.0) {
      events.doorLockedRattle = true;
    }
    if (threat.smashTimer <= 0) {
      door.state = 'open';
      events.doorSlammed = true;
      threat.headTilt = 0;
      threat.mode = threat.postSmashMode;
      threat.smashingDoorId = null;
    }
    return;
  }

  // Handle 'sniff' pause
  if (threat.mode === 'sniff') {
    threat.sniffTimer -= dt;
    threat.headTilt = 0.78;
    if (threat.sniffTimer <= 0) {
      threat.mode = 'investigate';
      threat.headTilt = 0.15;
    }
    return;
  }

  // Handle 4.0-second 'inspect_room' idle state
  if (threat.mode === 'inspect_room') {
    threat.roomInspectTimer -= dt;
    threat.headTilt = Math.sin(threat.roomInspectTimer * 1.9) * 0.42;
    if (threat.roomInspectTimer <= 0) {
      threat.headTilt = 0;
      threat.mode = 'patrol';
    }
    return;
  }

  // Handle 'check_locker' listen pause
  if (threat.mode === 'check_locker') {
    threat.searchTimer -= dt;
    threat.headTilt = -0.45;
    if (threat.searchTimer <= 0) {
      threat.checkingHideId = null;
      threat.headTilt = 0;
      threat.mode = 'patrol';
      const wp = threat.waypoints[threat.patrolIndex];
      threat.targetX = wp.x;
      threat.targetY = wp.y;
      threat.targetZ = wp.z;
    }
    return;
  }

  let baseSpeed = THREAT_PATROL_SPEED;
  if (threat.mode === 'chase') baseSpeed = THREAT_CHASE_SPEED;
  else if (threat.mode === 'investigate') baseSpeed = THREAT_INVESTIGATE_SPEED;
  else if (threat.mode === 'search') baseSpeed = THREAT_PATROL_SPEED * 0.92;
  const speed = baseSpeed * speedMult;

  const nextStep = findNextGridStep(
    threat.x,
    threat.y,
    threat.z,
    threat.targetX,
    threat.targetY,
    threat.targetZ,
    doors,
    shifts.gridOverrides
  );

  // Check if Resident is blocked by a closed unlocked door along its path -> 2.0s smash_door pause!
  const threatFloor = getFloorIndexFromY(threat.y);
  for (const door of doors) {
    if (door.floor !== threatFloor || door.state !== 'closed') continue;
    if (shifts.gridOverrides[gridOverrideKey(door.floor, door.gridX, door.gridZ)] === '#') continue;
    const cx = (door.gridX + 0.5) * TILE_SIZE;
    const cz = (door.gridZ + 0.5) * TILE_SIZE;
    if (Math.hypot(cx - threat.x, cz - threat.z) < 1.45) {
      threat.postSmashMode =
        threat.mode === 'chase'
          ? 'chase'
          : threat.mode === 'investigate'
            ? 'investigate'
            : 'patrol';
      threat.mode = 'smash_door';
      threat.smashTimer = DOOR_SMASH_DURATION;
      threat.smashingDoorId = door.id;
      threat.alertFlash = 0.7;
      events.doorLockedRattle = true;
      return;
    }
  }

  const toX = nextStep.x - threat.x;
  const toZ = nextStep.z - threat.z;
  const stepDist = Math.hypot(toX, toZ);

  if (stepDist > 0.06) {
    const moveDist = Math.min(stepDist, speed * dt);
    const vx = (toX / stepDist) * moveDist;
    const vz = (toZ / stepDist) * moveDist;

    // IncludeFurniture = true & allowUnderTables = false -> ZERO prop/table clipping!
    const resolved = resolveCircleMovement(
      threat.x,
      threat.y,
      threat.z,
      vx,
      vz,
      THREAT_RADIUS,
      doors,
      true,
      shifts.gridOverrides,
      false
    );
    const moved = Math.hypot(resolved.x - threat.x, resolved.z - threat.z);
    threat.x = resolved.x;
    threat.y = resolved.y;
    threat.z = resolved.z;

    const targetYaw = Math.atan2(-vx, -vz);
    let diff = targetYaw - threat.yaw;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    threat.yaw += diff * Math.min(1, dt * 8);

    threat.stepAccum += moved;
    if (threat.stepAccum >= 1.25) {
      threat.stepAccum = 0;
      events.footstepThreat = true;
    }
  }

  // Trigger 4-second "Search & Inspect" pause when entering a major room on patrol!
  if (threat.mode === 'patrol') {
    const curZone = getZoneAt(threat.x, threat.y, threat.z);
    if (MAJOR_INSPECT_ZONES.has(curZone) && curZone !== threat.lastInspectedZone) {
      threat.lastInspectedZone = curZone;
      threat.mode = 'inspect_room';
      threat.roomInspectTimer = ROOM_INSPECT_DURATION;
      return;
    }
  }

  // Occasional hiding spot listen check
  if (threat.mode === 'patrol' && player.hidingSpotId && sim.lockerCheckCooldown <= 0) {
    const spot = HIDE_SPOTS.find((h) => h.id === player.hidingSpotId);
    if (spot && Math.abs(spot.y - threat.y) < 1.5 && Math.hypot(spot.x - threat.x, spot.z - threat.z) < 3.2) {
      threat.mode = 'check_locker';
      threat.checkingHideId = spot.id;
      threat.searchTimer = 1.65;
      sim.lockerCheckCooldown = 14;
      events.threatSniff = true;
      return;
    }
  }

  const distToTarget = Math.hypot(threat.targetX - threat.x, threat.targetZ - threat.z);
  const sameFloorAsTarget = Math.abs(threat.targetY - threat.y) < 1.5;

  if (threat.mode === 'patrol') {
    if (sameFloorAsTarget && distToTarget < 0.75) {
      threat.patrolIndex = (threat.patrolIndex + 1) % threat.waypoints.length;
      const wp = threat.waypoints[threat.patrolIndex];
      threat.targetX = wp.x;
      threat.targetY = wp.y;
      threat.targetZ = wp.z;
    }
  } else if (threat.mode === 'chase') {
    if (!playerVisible && !threat.sawPlayerHideId) {
      threat.mode = 'search';
      threat.searchTimer = 4.2;
    }
  } else if (threat.mode === 'investigate' || threat.mode === 'search') {
    if (sameFloorAsTarget && distToTarget < 0.85) {
      threat.headTilt = 0.45;
      threat.searchTimer -= dt;
      if (threat.searchTimer <= 0) {
        threat.headTilt = 0;
        threat.mode = 'patrol';
        const wp = threat.waypoints[threat.patrolIndex];
        threat.targetX = wp.x;
        threat.targetY = wp.y;
        threat.targetZ = wp.z;
      }
    }
  }

  // Catch check (respects under-table stealth!)
  if (
    !player.hidingSpotId &&
    !concealedUnderTable &&
    player.invulnTimer <= 0 &&
    threat.hitCooldown <= 0 &&
    Math.abs(player.y - threat.y) < 1.6 &&
    Math.hypot(player.x - threat.x, player.z - threat.z) <= CATCH_RANGE &&
    hasLineOfSight(
      threat.x,
      threat.y,
      threat.z,
      player.x,
      player.y,
      player.z,
      doors,
      shifts.gridOverrides
    )
  ) {
    const zone = getZoneAt(player.x, player.y, player.z);
    const zoneHint =
      zone === 'grand_ballroom'
        ? 'The Grand Ballroom leaves you exposed — weave behind pillars or sprint for a doorway.'
        : zone === 'library_f1' || zone === 'library_mezzanine'
          ? 'Break line of sight behind tall Library bookshelves or climb to the Mezzanine.'
          : zone === 'kitchen'
            ? 'Circle the Kitchen counter or crouch under a cloth table.'
            : 'Slip into a wardrobe, crouch under a table, or throw a bottle to divert her.';
    triggerPlayerStrike(sim, events, zoneHint);
  }
}

function stepArchitectureShifts(sim: SimulationState, dt: number, events: StepEvents): void {
  const { player, shifts } = sim;

  // Scenario 1: Disappearing Door in Floor 2 Cabin 3
  if (shifts.cabin3PickupTaken && !shifts.cabin3Sealed && player.y >= FLOOR2_Y * 0.5) {
    const pCol = player.x / TILE_SIZE;
    const pRow = player.z / TILE_SIZE;
    if (pCol >= 18.05 && pCol <= 22.0 && pRow >= 2.0 && pRow <= 5.95) {
      const doorX = 17.5 * TILE_SIZE;
      const doorZ = 4.5 * TILE_SIZE;
      const toDoorX = doorX - player.x;
      const toDoorZ = doorZ - player.z;
      const dLen = Math.max(0.01, Math.hypot(toDoorX, toDoorZ));
      const fwdX = -Math.sin(player.yaw);
      const fwdZ = -Math.cos(player.yaw);
      const dot = (fwdX * toDoorX + fwdZ * toDoorZ) / dLen;

      if (dot < -0.5) {
        shifts.cabin3Sealed = true;
        shifts.cabin3SecretOpen = true;
        shifts.gridOverrides[gridOverrideKey(1, 17, 4)] = '#';
        shifts.gridOverrides[gridOverrideKey(1, 19, 6)] = '.';
        events.architectureShift = 'cabin3_sealed';
        sim.statusBanner = 'The doorway behind you vanished into solid plaster...';
        sim.statusBannerTimer = 3.4;
      }
    }
  }

  // Scenario 2: Endless Corridor Loop + Ringing Rotary Phone (replaces Red Door)
  if (sim.itemsFound >= 1 && !shifts.endlessLoopSolved && player.y >= FLOOR2_Y * 0.5) {
    const inCorridor =
      player.x >= ENDLESS_CORRIDOR_BOUNDS.minX &&
      player.x <= ENDLESS_CORRIDOR_BOUNDS.maxX &&
      player.z >= ENDLESS_CORRIDOR_BOUNDS.minZ &&
      player.z <= ENDLESS_CORRIDOR_BOUNDS.maxZ;

    if (inCorridor) {
      if (!shifts.endlessLoopActive) {
        shifts.endlessLoopActive = true;
        shifts.phoneSpawned = true;
        shifts.gridOverrides[
          gridOverrideKey(
            ENDLESS_CORRIDOR_BOUNDS.floor,
            ENDLESS_CORRIDOR_BOUNDS.shiftingWallGridX,
            ENDLESS_CORRIDOR_BOUNDS.shiftingWallGridZ
          )
        ] = '#';
        const triggerPhone = sim.phones.find((p) => p.id === 'phone_endless_corridor');
        if (triggerPhone) {
          triggerPhone.ringing = true;
          events.phoneRinging = true;
        }
        sim.statusBanner = 'The corridor seals shut — a rotary telephone begins to ring...';
        sim.statusBannerTimer = 3.4;
      }

      if (player.x < ENDLESS_CORRIDOR_BOUNDS.loopThresholdX) {
        player.x += ENDLESS_CORRIDOR_BOUNDS.loopResetDeltaX;
        events.architectureShift = 'endless_loop';
        sim.statusBanner = 'The corridor loops again! Answer the ringing Rotary Phone!';
        sim.statusBannerTimer = 3.0;
      }
    }
  }

  // Dream-Logic Door Shift: Lingering in a closed room > 10s quietly flips an adjacent wing divider
  if (shifts.dreamLastDoorId && shifts.dreamShiftCount < 4) {
    const lastDoor = sim.doors.find((d) => d.id === shifts.dreamLastDoorId);
    if (lastDoor && lastDoor.state === 'closed') {
      shifts.dreamRoomTimer += dt;
      if (shifts.dreamRoomTimer >= 10.0) {
        shifts.dreamRoomTimer = 0;
        shifts.dreamShiftCount += 1;
        const shiftTargets: Array<[FloorIndex, number, number]> = [
          [0, 10, 2],
          [0, 14, 2],
          [1, 13, 2],
          [1, 9, 20],
        ];
        const [fl, sc, sr] = shiftTargets[(shifts.dreamShiftCount - 1) % shiftTargets.length];
        const k = gridOverrideKey(fl, sc, sr);
        shifts.gridOverrides[k] = shifts.gridOverrides[k] === '#' ? '.' : '#';
        events.architectureShift = 'dream_shift';
      }
    } else {
      shifts.dreamRoomTimer = 0;
    }
  }
}

function stepParanoiaAndPhones(
  sim: SimulationState,
  input: InputSample,
  dt: number,
  events: StepEvents
): void {
  const { player, threat, paranoia, phones } = sim;

  if (paranoia.radioWhisperCooldown > 0) {
    paranoia.radioWhisperCooldown = Math.max(0, paranoia.radioWhisperCooldown - dt);
  }
  if (paranoia.radioMessageTimer > 0) {
    paranoia.radioMessageTimer = Math.max(0, paranoia.radioMessageTimer - dt);
    if (paranoia.radioMessageTimer <= 0) paranoia.radioMessage = null;
  }
  if (paranoia.ghostFootstepsCooldown > 0) {
    paranoia.ghostFootstepsCooldown = Math.max(0, paranoia.ghostFootstepsCooldown - dt);
  }
  if (paranoia.ghostEyeFlashTimer > 0) {
    paranoia.ghostEyeFlashTimer = Math.max(0, paranoia.ghostEyeFlashTimer - dt);
  }
  if (paranoia.mirrorHauntTimer > 0) {
    paranoia.mirrorHauntTimer = Math.max(0, paranoia.mirrorHauntTimer - dt);
    if (paranoia.mirrorHauntTimer <= 0) paranoia.mirrorHauntedId = null;
  }

  // Smoothly lag mirror reflection yaw by ~0.38s
  let yawDiff = player.yaw - paranoia.mirrorLagYaw;
  while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
  while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
  paranoia.mirrorLagYaw += yawDiff * Math.min(1, dt * 3.2);

  // 1. Pocket Radio through-wall warnings when Threat <= 10m out of line-of-sight
  const dist3d = Math.hypot(
    player.x - threat.x,
    (player.y - threat.y) * 1.4,
    player.z - threat.z
  );
  if (dist3d <= 10.0 && paranoia.radioWhisperCooldown <= 0) {
    const los = hasLineOfSight(
      threat.x,
      threat.y,
      threat.z,
      player.x,
      player.y,
      player.z,
      sim.doors,
      sim.shifts.gridOverrides
    );
    if (!los) {
      const lines = [
        '"...she is right behind that wall..."',
        '"...don\'t turn around..."',
        '"...crouch under a table, now..."',
        '"...take the stairs before she crosses..."',
      ];
      const msg = lines[(sim.loopCount + Math.floor(sim.elapsedSeconds)) % lines.length];
      paranoia.radioMessage = msg;
      paranoia.radioMessageTimer = 3.2;
      paranoia.radioWhisperCooldown = 12.0;
      events.radioWhisper = true;
    }
  }

  // 2. Auditory Paranoia: walking/running > 6s without looking back triggers footsteps 2.5m behind!
  const moveMag = Math.hypot(input.moveForward, input.moveRight);
  if (moveMag > 0.2 && !player.hidingSpotId && Math.abs(input.yawDelta) < 0.015) {
    paranoia.noTurnTimer += dt;
    if (paranoia.noTurnTimer >= 6.0 && paranoia.ghostFootstepsCooldown <= 0) {
      paranoia.noTurnTimer = 0;
      paranoia.ghostFootstepsActive = true;
      paranoia.ghostFootstepsCooldown = 28.0;
      events.ghostFootstepsBehind = true;
      if (!sim.statusBanner) {
        sim.statusBanner = 'Heavy footsteps sprint close behind your neck...';
        sim.statusBannerTimer = 2.2;
      }
    }
  } else if (Math.abs(input.yawDelta) > 0.04) {
    paranoia.noTurnTimer = 0;
    if (paranoia.ghostFootstepsActive) {
      // Spinning around abruptly cuts footsteps & flashes phantom red eyes down the hall!
      paranoia.ghostFootstepsActive = false;
      const fwdX = -Math.sin(player.yaw);
      const fwdZ = -Math.cos(player.yaw);
      paranoia.ghostEyeX = player.x + fwdX * 8.5;
      paranoia.ghostEyeY = player.y + 1.85;
      paranoia.ghostEyeZ = player.z + fwdZ * 8.5;
      paranoia.ghostEyeFlashTimer = 0.55;
      events.ghostEyeFlash = true;
    }
  }

  // 3. Haunted Mirror inspection (~20% chance when staring into nearby wall mirror)
  const activeFloor = getFloorIndexFromY(player.y);
  for (const mirror of HAUNTED_MIRRORS) {
    if (mirror.floor !== activeFloor) continue;
    const mDist = Math.hypot(mirror.x - player.x, mirror.z - player.z);
    if (mDist < 2.4 && paranoia.mirrorHauntTimer <= 0) {
      const roll = Math.floor((sim.elapsedSeconds * 37 + mirror.id.length * 13) % 100);
      if (roll < 20 && paranoia.ghostFootstepsCooldown < 24) {
        paranoia.mirrorHauntTimer = 0.65;
        paranoia.mirrorHauntedId = mirror.id;
        paranoia.ghostFootstepsCooldown = 26;
        events.mirrorHaunted = true;
      }
    }
  }

  // 4. Ambient Rotary Phones ringing occasionally
  paranoia.phoneRingCooldown -= dt;
  if (paranoia.phoneRingCooldown <= 0) {
    paranoia.phoneRingCooldown = 28.0;
    const ambientPhones = phones.filter((p) => !p.isLoopTrigger && !p.ringing);
    if (ambientPhones.length > 0) {
      const picked = ambientPhones[Math.floor(sim.elapsedSeconds) % ambientPhones.length];
      picked.ringing = true;
      events.phoneRinging = true;
    }
  }
}

export function stepSimulation(
  sim: SimulationState,
  input: InputSample,
  rawDt: number,
  settings: GameSettings = DEFAULT_SETTINGS
): StepEvents {
  const dt = Math.min(rawDt, 0.05);
  sim.glassesCooldownMax = settings.glassesCooldownSec;

  const events: StepEvents = {
    footstepPlayer: false,
    footstepThreat: false,
    creakyBoard: false,
    propKnocked: null,
    pickup: null,
    shardPickup: false,
    throwablePickup: false,
    bottleThrown: false,
    bottleShattered: null,
    loreInspected: false,
    phoneRinging: false,
    phoneAnswered: false,
    radioWhisper: false,
    ghostFootstepsBehind: false,
    ghostEyeFlash: false,
    mirrorHaunted: false,
    glassesToggled: false,
    midnightQuake: false,
    architectureShift: null,
    doorOpened: false,
    doorSlammed: false,
    doorUnlocked: false,
    doorLockedRattle: false,
    steamShutOff: false,
    breakerRestored: false,
    hideToggle: false,
    lockerTornOpen: false,
    threatSniff: false,
    threatAlerted: false,
    playerHit: false,
    jumpscareStarted: false,
    rebirthStarted: false,
    rebirthCompleted: false,
    escaped: false,
    defeated: false,
    echoInspected: false,
    phantomTriggered: false,
  };

  if (sim.phase === 'jumpscare') {
    sim.jumpscareTimer -= dt;
    sim.jumpscareProgress = clamp(1 - sim.jumpscareTimer / JUMPSCARE_DURATION, 0, 1);
    if (sim.jumpscareTimer <= 0) {
      sim.phase = 'rebirth';
      sim.rebirthTimer = REBIRTH_DURATION;
      sim.rebirthProgress = 0;
      events.rebirthStarted = true;
      events.defeated = true;
    }
    return events;
  }

  if (sim.phase === 'rebirth') {
    sim.rebirthTimer -= dt;
    sim.rebirthProgress = clamp(1 - sim.rebirthTimer / REBIRTH_DURATION, 0, 1);
    if (sim.rebirthTimer <= 0) {
      rebirthFromLoop(sim, events);
    }
    return events;
  }

  if (sim.phase !== 'playing') return events;

  sim.elapsedSeconds += dt;
  if (sim.damageFlash > 0) sim.damageFlash = Math.max(0, sim.damageFlash - dt * 2.2);
  if (sim.statusBannerTimer > 0) {
    sim.statusBannerTimer -= dt;
    if (sim.statusBannerTimer <= 0) sim.statusBanner = null;
  }
  if (sim.echoNoteTimer > 0) {
    sim.echoNoteTimer -= dt;
    if (sim.echoNoteTimer <= 0) sim.echoNoteText = null;
  }
  if (sim.loreOverlayTimer > 0) {
    sim.loreOverlayTimer -= dt;
    if (sim.loreOverlayTimer <= 0) sim.loreOverlay = null;
  }

  // Flashlight toggle + battery drain / trickle recharge
  if (input.flashlightToggle) {
    if (sim.player.flashlightOn) {
      sim.player.flashlightOn = false;
    } else if (sim.player.battery > 1) {
      sim.player.flashlightOn = true;
    }
  }
  const batterySec = Math.max(20, settings.flashlightBatterySec);
  if (sim.player.flashlightOn) {
    sim.player.battery = Math.max(0, sim.player.battery - (100 / batterySec) * dt);
    if (sim.player.battery <= 0) {
      sim.player.flashlightOn = false;
      sim.statusBanner = 'Flashlight battery depleted — recharging slowly...';
      sim.statusBannerTimer = 2.4;
    }
  } else {
    sim.player.battery = Math.min(100, sim.player.battery + (100 / (batterySec * 1.4)) * dt);
  }

  // Spectral Glasses Timers & Toggle
  if (sim.glasses.active) {
    sim.glasses.activeTimer = Math.max(0, sim.glasses.activeTimer - dt);
    if (sim.glasses.activeTimer <= 0) {
      sim.glasses.active = false;
      sim.glasses.cooldownTimer = settings.glassesCooldownSec;
      events.glassesToggled = true;
    }
  } else if (sim.glasses.cooldownTimer > 0) {
    sim.glasses.cooldownTimer = Math.max(0, sim.glasses.cooldownTimer - dt);
  }

  if (input.glassesToggle) {
    if (sim.glasses.active) {
      sim.glasses.active = false;
      sim.glasses.cooldownTimer = settings.glassesCooldownSec;
      events.glassesToggled = true;
    } else if (sim.glasses.cooldownTimer <= 0) {
      sim.glasses.active = true;
      sim.glasses.activeTimer = GLASSES_ACTIVE_DURATION;
      events.glassesToggled = true;
      sim.statusBanner = 'Spectral Vision Active — Threat Revealed';
      sim.statusBannerTimer = 2.0;
    } else {
      sim.statusBanner = `Spectral Glasses recharging (${Math.ceil(sim.glasses.cooldownTimer)}s)`;
      sim.statusBannerTimer = 1.6;
    }
  }

  for (const door of sim.doors) {
    const target = door.state === 'open' ? 1 : 0;
    door.openProgress += (target - door.openProgress) * Math.min(1, dt * 7);
  }

  if (sim.escaping) {
    sim.escapeTimer -= dt;
    if (sim.escapeTimer <= 0) {
      sim.phase = 'gameover';
      sim.victory = true;
      events.escaped = true;
    }
    return events;
  }

  // Phantom Echo scheduling
  const phantom = sim.phantomEcho;
  if (phantom.active) {
    phantom.progress += dt * 0.85;
    phantom.x = phantom.startX + (phantom.endX - phantom.startX) * phantom.progress;
    phantom.z = phantom.startZ + (phantom.endZ - phantom.startZ) * phantom.progress;
    if (phantom.progress >= 1) {
      phantom.active = false;
      phantom.cooldown = 24 + (sim.loopCount % 3) * 4;
    }
  } else {
    phantom.cooldown -= dt;
    if (phantom.cooldown <= 0 && sim.elapsedSeconds > 10) {
      phantom.active = true;
      phantom.progress = 0;
      const useUpper = Math.floor(sim.elapsedSeconds) % 2 === 0;
      phantom.y = useUpper ? FLOOR2_Y : 0;
      phantom.startX = useUpper ? 11.5 * TILE_SIZE : 9.0 * TILE_SIZE;
      phantom.startZ = useUpper ? 1.5 * TILE_SIZE : 14.5 * TILE_SIZE;
      phantom.endX = useUpper ? 15.5 * TILE_SIZE : 14.0 * TILE_SIZE;
      phantom.endZ = useUpper ? 1.5 * TILE_SIZE : 14.5 * TILE_SIZE;
      phantom.x = phantom.startX;
      phantom.z = phantom.startZ;
      phantom.yaw = -Math.PI / 2;
      events.phantomTriggered = true;
    }
  }

  const { player, shifts } = sim;
  if (player.invulnTimer > 0) player.invulnTimer = Math.max(0, player.invulnTimer - dt);
  if (player.creakCooldown > 0) player.creakCooldown = Math.max(0, player.creakCooldown - dt);

  // Camera look (strictly clamped pitch between -1.3 and 1.3 radians)
  player.yaw += input.yawDelta;
  if (player.hidingSpotId) {
    const spot = HIDE_SPOTS.find((l) => l.id === player.hidingSpotId);
    if (spot) {
      let diff = player.yaw - spot.facingAngle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      diff = clamp(diff, -0.36, 0.36);
      player.yaw = spot.facingAngle + diff;
    }
  }
  player.pitch = clamp(player.pitch + input.pitchDelta, -1.3, 1.3);

  if (input.crouchToggle && !player.hidingSpotId) {
    if (player.crouching && player.isUnderTable) {
      sim.statusBanner = 'Too low to stand under the table';
      sim.statusBannerTimer = 1.6;
    } else {
      player.crouching = !player.crouching;
    }
  }

  player.noiseLevel = Math.max(0, player.noiseLevel - dt * 1.35);

  if (!player.hidingSpotId) {
    const moveLen = Math.hypot(input.moveForward, input.moveRight);
    const wantsMove = moveLen > 0.05;
    const canSprint = wantsMove && input.sprint && !player.crouching && player.stamina > 2;
    player.sprinting = canSprint;

    if (canSprint) {
      player.stamina = Math.max(0, player.stamina - dt * 23);
    } else {
      player.stamina = Math.min(100, player.stamina + dt * (wantsMove ? 10 : 21));
    }

    if (wantsMove) {
      const normF = input.moveForward / Math.max(1, moveLen);
      const normR = input.moveRight / Math.max(1, moveLen);

      const forwardX = -Math.sin(player.yaw);
      const forwardZ = -Math.cos(player.yaw);
      const rightX = Math.cos(player.yaw);
      const rightZ = -Math.sin(player.yaw);

      const speed = player.crouching ? CROUCH_SPEED : canSprint ? SPRINT_SPEED : WALK_SPEED;
      const vx = (forwardX * normF + rightX * normR) * speed * dt;
      const vz = (forwardZ * normF + rightZ * normR) * speed * dt;

      // Sprinting slams closed unlocked doors on current floor automatically
      const pFloor = getFloorIndexFromY(player.y);
      if (canSprint) {
        for (const door of sim.doors) {
          if (door.floor === pFloor && door.state === 'closed') {
            if (shifts.gridOverrides[gridOverrideKey(door.floor, door.gridX, door.gridZ)] === '#') {
              continue;
            }
            const cx = (door.gridX + 0.5) * TILE_SIZE;
            const cz = (door.gridZ + 0.5) * TILE_SIZE;
            if (Math.hypot(cx - player.x, cz - player.z) < 1.45) {
              door.state = 'open';
              player.noiseLevel = Math.max(player.noiseLevel, 0.96);
              events.doorSlammed = true;
            }
          }
        }
      }

      const resolved = resolveCircleMovement(
        player.x,
        player.y,
        player.z,
        vx,
        vz,
        PLAYER_RADIUS,
        sim.doors,
        true,
        shifts.gridOverrides,
        player.crouching
      );

      const moved = Math.hypot(resolved.x - player.x, resolved.z - player.z);
      player.x = resolved.x;
      player.y = resolved.y;
      player.z = resolved.z;

      const moveNoise = player.crouching ? 0.1 : canSprint ? 0.88 : 0.42;
      player.noiseLevel = Math.max(player.noiseLevel, moveNoise);

      // Creaky Wood Floorboards
      if (
        !player.crouching &&
        moved > 0.005 &&
        isOnCreakyFloor(player.x, player.y, player.z) &&
        player.creakCooldown <= 0
      ) {
        player.creakCooldown = 1.65;
        player.noiseLevel = Math.max(player.noiseLevel, 0.9);
        events.creakyBoard = true;
        if (!sim.statusBanner) {
          sim.statusBanner = 'Creaky Floorboard! (Crouch to stay silent)';
          sim.statusBannerTimer = 1.9;
        }
      }

      // Knockable Props crash if sprinting past
      if (canSprint) {
        const curFloor = getFloorIndexFromY(player.y);
        for (const kp of sim.knockables) {
          if (
            kp.floor === curFloor &&
            !kp.knocked &&
            Math.hypot(kp.x - player.x, kp.z - player.z) < 1.15
          ) {
            kp.knocked = true;
            player.noiseLevel = 1.0;
            events.propKnocked = kp.label;
            sim.statusBanner = `Knocked over ${kp.label}!`;
            sim.statusBannerTimer = 2.1;
          }
        }
      }

      player.stepAccum += moved;
      const stride = player.crouching ? 1.45 : canSprint ? 1.15 : 1.35;
      if (player.stepAccum >= stride) {
        player.stepAccum = 0;
        events.footstepPlayer = true;
      }
    }

    // Update Under-Table stealth state when crouching beneath any HideTable
    const activeFloor = getFloorIndexFromY(player.y);
    let underTbl: string | null = null;
    if (player.crouching) {
      for (const tbl of HIDE_TABLES) {
        if (
          tbl.floor === activeFloor &&
          player.x >= tbl.minX &&
          player.x <= tbl.maxX &&
          player.z >= tbl.minZ &&
          player.z <= tbl.maxZ
        ) {
          underTbl = tbl.id;
          break;
        }
      }
    }
    player.isUnderTable = underTbl !== null;
    player.underTableId = underTbl;
  } else {
    player.sprinting = false;
    player.isUnderTable = false;
    player.underTableId = null;
    player.stamina = Math.min(100, player.stamina + dt * 22);
  }

  // Scalding Steam Hazard knockback
  if (!sim.steamShutOff && player.y < 1.5) {
    const sdx = player.x - STEAM_VALVE_POS.x;
    const sdz = player.z - (STEAM_VALVE_POS.z - 1.2);
    const steamDist = Math.hypot(sdx, sdz);
    if (steamDist < 1.35) {
      const pushLen = Math.max(0.01, steamDist);
      const pushed = resolveCircleMovement(
        player.x,
        player.y,
        player.z,
        (sdx / pushLen) * 0.55,
        (sdz / pushLen) * 0.55,
        PLAYER_RADIUS,
        sim.doors,
        true,
        shifts.gridOverrides,
        player.crouching
      );
      player.x = pushed.x;
      player.y = pushed.y;
      player.z = pushed.z;
      sim.statusBanner = 'Scalding Steam! Use Valve Wheel first';
      sim.statusBannerTimer = 2.0;
    }
  }

  if (input.interactPressed) {
    if (sim.loreOverlay) {
      sim.loreOverlay = null;
      sim.loreOverlayTimer = 0;
    } else {
      performInteraction(sim, events);
    }
  }

  if (input.throwPressed) {
    throwBottleOrCan(sim, events);
  }

  stepProjectiles(sim, dt, events);
  stepArchitectureShifts(sim, dt, events);
  stepParanoiaAndPhones(sim, input, dt, events);
  stepThreatAI(sim, dt, events, settings.monsterSpeedMult);

  return events;
}

export function buildHudSnapshot(sim: SimulationState): GameHudSnapshot {
  const dist3d = Math.hypot(
    sim.player.x - sim.threat.x,
    (sim.player.y - sim.threat.y) * 1.4,
    sim.player.z - sim.threat.z
  );
  const proximityDanger = clamp(1 - (dist3d - 2.5) / 18.0, 0, 1);
  const chaseBoost =
    sim.threat.mode === 'chase'
      ? 0.35
      : sim.threat.mode === 'investigate' || sim.threat.mode === 'sniff' || sim.threat.mode === 'smash_door'
        ? 0.16
        : 0;
  const dangerLevel = clamp(proximityDanger + chaseBoost, 0, 1);

  const radioStaticLevel =
    dist3d <= 25.0 ? clamp((1 - dist3d / 25.0) * (sim.threat.mode === 'chase' ? 1.0 : 0.85), 0, 1) : 0;

  const interaction = sim.phase === 'playing' ? findBestInteraction(sim) : null;
  const hideSpot = sim.player.hidingSpotId
    ? HIDE_SPOTS.find((h) => h.id === sim.player.hidingSpotId) ?? null
    : null;
  const loreFound = sim.lore.filter((l) => l.inspected).length;

  return {
    phase: sim.phase,
    victory: sim.victory,
    loopCount: sim.loopCount,
    elapsedSeconds: sim.elapsedSeconds,
    strikesRemaining: sim.player.strikesRemaining,
    maxStrikes: 1,
    stamina: Math.round(sim.player.stamina),
    crouching: sim.player.crouching,
    isUnderTable: sim.player.isUnderTable,
    hiding: sim.player.hidingSpotId !== null || sim.player.isUnderTable,
    hidingKind: sim.player.isUnderTable ? 'table' : hideSpot ? hideSpot.kind : null,
    currentFloor: getFloorIndexFromY(sim.player.y) === 1 ? 2 : 1,
    steamShutOff: sim.steamShutOff,
    powerRestored: sim.powerRestored,
    inventory: [...sim.inventory],
    selectedSlot: sim.selectedSlot,
    bottlesCount: sim.player.bottlesCount,
    flashlightOn: sim.player.flashlightOn,
    battery: Math.round(sim.player.battery),
    currentZone: getZoneAt(sim.player.x, sim.player.y, sim.player.z),
    objectiveText: computeObjectiveText(sim),
    promptText: interaction ? interaction.label : null,
    promptActionable: interaction ? interaction.actionable : false,
    dangerLevel,
    radioStaticLevel,
    radioMessage: sim.paranoia.radioMessage,
    threatMode: sim.threat.mode,
    roomsUnlocked: sim.roomsUnlocked,
    itemsFound: sim.itemsFound,
    loreFound,
    loreTotal: sim.lore.length,
    damageFlash: sim.damageFlash,
    statusBanner: sim.statusBanner,
    echoNoteText: sim.echoNoteText,
    loreOverlay: sim.loreOverlay,
    jumpscareProgress: sim.jumpscareProgress,
    rebirthProgress: sim.rebirthProgress,
    glassesActive: sim.glasses.active,
    glassesTimeLeft: Number(sim.glasses.activeTimer.toFixed(1)),
    glassesCooldownLeft: Number(sim.glasses.cooldownTimer.toFixed(1)),
    glassesCooldownMax: sim.glassesCooldownMax,
    glassShardsCollected: sim.glasses.shardsCollected,
    quakeTriggered: sim.shifts.midnightQuakeTriggered,
    endlessLoopActive: sim.shifts.endlessLoopActive && !sim.shifts.endlessLoopSolved,
    cabin3Sealed: sim.shifts.cabin3Sealed,
    phoneRinging: sim.phones.some((p) => p.ringing),
  };
}
