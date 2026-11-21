import {
  CreakyFloorZone,
  DoorSpec,
  FloorIndex,
  GlassShardRuntime,
  HauntedMirrorSpec,
  HideSpotSpec,
  HideTableSpec,
  ItemId,
  ItemMeta,
  ItemSpawnPoint,
  LoreItemRuntime,
  ObstacleBox,
  RotaryPhoneRuntime,
  ThrowablePickupRuntime,
  ZoneId,
} from './types';

export const TILE_SIZE = 2.0; // Strict 2.0m narrow corridors
export const GRID_COLS = 23;
export const GRID_ROWS = 23;
export const FLOOR_HEIGHT = 2.8; // Standard 2.8m claustrophobic corridor ceiling
export const FLOOR2_Y = 3.5; // Floor 2 deck elevation (Y=0 -> Y=3.5 via stairs)
export const BALLROOM_CEILING_Y = 6.0; // Double-height Grand Ballroom ceiling

/**
 * 23x23 FLOOR 1 BASE LAYOUT (46m x 46m, Y = 0)
 * - West Wing: Boiler Utility, West Cellar & Service Stairs, Pantry, Kitchen
 * - Central Core: North Gallery, Main Stairs, Grand Ballroom (Y=6.0m), Entrance Hall & Chained Exit
 * - East Wing: East Study, Security Storage, 2-Story Decayed Library (16..21,10..17)
 */
export const FLOOR1_GRID: readonly string[] = [
  '#######################', // 00
  '#.....#.........#.....#', // 01: Boiler (1..5) | N Gallery (7..15) | East Study (17..21)
  '#.....#.........#.....#', // 02
  '#.....#.........#.....#', // 03
  '#.....#.........#.....#', // 04
  '###.###...###...###.###', // 05: (3,5)=Boiler Door | (10..12,5)=Main Stair under-wall | (19,5)=East Study Door
  '#.........#.#.........#', // 06: (6,6)=Boiler-Central Shortcut [QUAKE->'#'] | (11,6)=Main Stairs Top | (13..21,6)=East N Hall
  '########.##.##.######.#', // 07: (2,7)=Cellar Breach [QUAKE->'.'] | (11,7)=Main Stairs Mid | (17,7)/(21,7)=East Wing Passage
  '##...###.##.##.#......#', // 08: (2..4,8)=Cellar N Landing | (11,8)=Main Stairs Base | (16..21,8)=East Cross Hall
  '##.#.###.......###.####', // 09: (2,9)=West Stairs Top | (11,9)=Main Stair Throat [QUAKE->'#'] | (18,9)=Library N Door
  '##.#.###.##.#.##......#', // 10: (2,10)=West Stairs Mid | (8,10)(11,10)(14,10)=Ballroom N Archways | (16..21,10)=Library N
  '##.#.###.......#......#', // 11: (2,11)=West Stairs Base | (8..14,11)=Grand Ballroom | (16..21,11)=Library
  '########.......#......#', // 12: (4,12)=Pantry Breach [QUAKE->'.'] | Grand Ballroom | Library (21,12)=Lib Stairs Top
  '#....#.#.......#......#', // 13: Pantry (1..4) | West South Hall (6) | Grand Ballroom | Library (21,13)=Lib Stairs Mid
  '#.....................#', // 14: (5,14)=Pantry Door | (7,14)=Ballroom W Door | (15,14)=Ballroom-Library Door | (21,14)=Lib Stairs Bot
  '#....#.#.......#......#', // 15: Pantry | West South Hall | Grand Ballroom | Library
  '######.#.......#......#', // 16: Kitchen Divider | West South Hall | Grand Ballroom | Library
  '#......#.......#......#', // 17: Kitchen (1..4) | (5,17)=Kitchen N Door | Grand Ballroom | Library
  '#....#.####.####.######', // 18: (11,18)=Ballroom South Arch | (16,18)=Library South Door
  '#....#.###.......#....#', // 19: Kitchen | Entrance/SE Foyer (10..16) | Security Storage (18..21)
  '#.....................#', // 20: (5,20)=Kitchen S Door | Entrance Hall (11) | (17,20)=Security Locked Door
  '#....#####.......#....#', // 21: Kitchen | Entrance Spawn (11,21) | Security Storage
  '###########.###########', // 22: Chained Exit Door at (11,22)
];

/**
 * 23x23 FLOOR 2 BASE LAYOUT (46m x 46m, Y = 3.5m, Ceiling = 6.3m)
 */
export const FLOOR2_GRID: readonly string[] = [
  '#######################', // 00
  '#...............#######', // 01: Upper North Endless Corridor (3..10) + Central Hall (11..15)
  '#..#######...###.#....#', // 02: Cabin 1 (1..2) | Central N | East Hall (16) | Cabin 3 (18..21)
  '#..#######.......#....#', // 03: Cabin 1 | Upper Hall | Cabin 3
  '#..######.............#', // 04: Cabin 1 | Upper Hall | (17,4)=Cabin 3 Door [SHIFTS->'#'] | Cabin 3
  '#..#######...###.#....#', // 05: Cabin 1 | (11,5)=Main Stairs Top [QUAKE->'#'] | Cabin 3
  '##.########.####.######', // 06: (2,6)=Cabin 1 S Door | (11,6)=Main Stairs Shaft | (19,6)=Cabin 3 Wardrobe [SHIFTS->'.']
  '##...######.####.##.###', // 07: West Upper Hall (2..4) | Main Stairs Shaft (11) | Secret Passage (19)
  '###..######.####.##.###', // 08: (2,8)=# above F1 stair bottom | (3..4,8) | Secret Passage (19)
  '##.#.###########....###', // 09: (2,9)=West Stairs | (4,9)=West Hall | (16..19,9)=East Secret Connect
  '##.#.###########......#', // 10: (2,10)=West Stairs | Library Mezzanine North (16..21)
  '##.#.###########......#', // 11: (2,11)=West Stairs | Library Mezzanine North + Lib Stairs Top (21,11)
  '##....##########......#', // 12: West Stairs F2 Landing (2..5) | Library Mezz + Atrium Void (17..19) + Lib Stairs (21)
  '#####..#########......#', // 13: West South Corr (5..6) | Library Mezz + Atrium Void + Lib Stairs
  '#####..#########......#', // 14: West South Corr (5..6) | Library Mezz + Atrium Void + Lib Stairs
  '#....#.#########......#', // 15: Cabin 2 (1..4) | West Corr (6) | Library Mezz + Atrium Void
  '#....#.#########......#', // 16: Cabin 2 | West Corr (6) | Library Mezz South
  '#......#########......#', // 17: (5,17)=Cabin 2 Door | Library Mezz South
  '#....#.#########.######', // 18: Cabin 2 | (6,18) | (16,18)=Mezz-South Connector
  '#....#................#', // 19: Cabin 2 | South Gallery (6..16) | (17,19)=Master Door | Master Bed (18..21)
  '#....#...........#....#', // 20: Cabin 2 | South Gallery (6..16) | Master Bed (18..21)
  '##################....#', // 21: Master Bedroom South Alcove (18..21)
  '#######################', // 22
];

export const FLOOR_GRIDS: readonly (readonly string[])[] = [FLOOR1_GRID, FLOOR2_GRID];

export function isBallroomCell(col: number, row: number): boolean {
  return col >= 8 && col <= 14 && row >= 11 && row <= 17;
}

export function isLibraryAtriumCell(col: number, row: number): boolean {
  return col >= 17 && col <= 19 && row >= 12 && row <= 15;
}

export function isMainStairShaft(col: number, row: number): boolean {
  return col === 11 && row >= 6 && row <= 8;
}

export function isWestServiceStairShaft(col: number, row: number): boolean {
  return col === 2 && row >= 9 && row <= 11;
}

export function isLibraryStairShaft(col: number, row: number): boolean {
  return col === 21 && row >= 12 && row <= 14;
}

export function isStairShaftCell(col: number, row: number): boolean {
  return (
    isMainStairShaft(col, row) ||
    isWestServiceStairShaft(col, row) ||
    isLibraryStairShaft(col, row)
  );
}

export function skipsInterFloorSlab(col: number, row: number): boolean {
  return isStairShaftCell(col, row) || isBallroomCell(col, row) || isLibraryAtriumCell(col, row);
}

/**
 * Dynamic Architecture + Procedural Wing + Dream-Logic managed cells.
 * Excluded from static InstancedMesh walls so they toggle cleanly at runtime!
 */
export const SHIFT_MANAGED_CELLS: ReadonlyArray<{ floor: FloorIndex; col: number; row: number }> = [
  // Architecture Shift triggers
  { floor: 1, col: 17, row: 4 }, // Cabin 3 Disappearing Door cell
  { floor: 1, col: 19, row: 6 }, // Cabin 3 Secret Wardrobe Passage
  { floor: 1, col: 9, row: 1 }, // Endless Corridor shifting bulkhead behind player (broken by Rotary Phone)
  { floor: 0, col: 6, row: 6 }, // Midnight Quake Boiler-Central shortcut collapse
  { floor: 0, col: 11, row: 9 }, // Midnight Quake Main Stair F1 seal
  { floor: 1, col: 11, row: 5 }, // Midnight Quake Main Stair F2 seal
  { floor: 0, col: 2, row: 7 }, // Midnight Quake West Cellar North breach
  { floor: 0, col: 4, row: 12 }, // Midnight Quake West Cellar Pantry breach
  // Procedural Wing Divider Variants (F1 North Gallery, East Wing, F2 North/South Halls)
  { floor: 0, col: 10, row: 2 },
  { floor: 0, col: 12, row: 3 },
  { floor: 0, col: 14, row: 2 },
  { floor: 0, col: 9, row: 3 },
  { floor: 0, col: 13, row: 2 },
  { floor: 0, col: 17, row: 7 }, // East Wing West-side pass
  { floor: 0, col: 21, row: 7 }, // East Wing East-side pass
  { floor: 1, col: 13, row: 2 },
  { floor: 1, col: 14, row: 3 },
  { floor: 1, col: 9, row: 20 },
  { floor: 1, col: 13, row: 20 },
];

export function isShiftManagedCell(floor: FloorIndex, col: number, row: number): boolean {
  return SHIFT_MANAGED_CELLS.some((s) => s.floor === floor && s.col === col && s.row === row);
}

/**
 * Seeded procedural wing stitching: reshapes corridor turns, East Wing passages,
 * and North/South gallery partitions each run while preserving full solvability.
 */
export function generateProceduralWingOverrides(seed: number): Record<string, '#' | '.'> {
  let s = (seed || 1337) >>> 0;
  const nextRand = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };

  const overrides: Record<string, '#' | '.'> = {};
  const set = (fl: FloorIndex, col: number, row: number, val: '#' | '.') => {
    overrides[`${fl}:${col},${row}`] = val;
  };

  // 1. Floor 1 North Gallery divider pattern (3 procedural maze configurations)
  const f1Pattern = Math.floor(nextRand() * 3);
  if (f1Pattern === 0) {
    set(0, 10, 2, '#');
    set(0, 12, 3, '#');
    set(0, 14, 2, '#');
  } else if (f1Pattern === 1) {
    set(0, 9, 3, '#');
    set(0, 13, 2, '#');
    set(0, 12, 3, '#');
  } else {
    set(0, 10, 2, '#');
    set(0, 9, 3, '#');
    set(0, 14, 2, '#');
  }

  // 2. Floor 1 East Wing turn flip: either (17, 7) or (21, 7) open
  if (nextRand() > 0.5) {
    set(0, 17, 7, '.');
    set(0, 21, 7, '#');
  } else {
    set(0, 17, 7, '#');
    set(0, 21, 7, '.');
  }

  // 3. Floor 2 Upper & South Gallery dividers
  if (nextRand() > 0.5) {
    set(1, 13, 2, '#');
  } else {
    set(1, 14, 3, '#');
  }

  if (nextRand() > 0.5) {
    set(1, 9, 20, '#');
  } else {
    set(1, 13, 20, '#');
  }

  return overrides;
}

export function getSurfaceY(x: number, z: number, currentFloorHint: FloorIndex): number {
  const col = Math.floor(x / TILE_SIZE);

  // 1. Main Wooden Staircase: col 11, z in [12.0, 18.0] (South z=18 Y=0 -> North z=12 Y=3.5)
  if (col === 11 && z >= 12.0 && z <= 18.0) {
    const t = Math.max(0, Math.min(1, (18.0 - z) / 6.0));
    return t * FLOOR2_Y;
  }

  // 2. West Service / Cellar Staircase: col 2, z in [18.0, 24.0] (North z=18 Y=0 -> South z=24 Y=3.5)
  if (col === 2 && z >= 18.0 && z <= 24.0) {
    const t = Math.max(0, Math.min(1, (z - 18.0) / 6.0));
    return t * FLOOR2_Y;
  }

  // 3. Library Grand Staircase: col 21, z in [24.0, 30.0] (South z=30 Y=0 -> North z=24 Y=3.5)
  if (col === 21 && z >= 24.0 && z <= 30.0) {
    const t = Math.max(0, Math.min(1, (30.0 - z) / 6.0));
    return t * FLOOR2_Y;
  }

  return currentFloorHint === 1 ? FLOOR2_Y : 0;
}

export function getFloorIndexFromY(y: number): FloorIndex {
  return y >= FLOOR2_Y * 0.5 ? 1 : 0;
}

export function getZoneAt(x: number, y: number, z: number): ZoneId {
  const col = x / TILE_SIZE;
  const row = z / TILE_SIZE;

  if (
    (col >= 11 && col < 12 && row >= 6 && row <= 9) ||
    (col >= 2 && col < 3 && row >= 9 && row <= 12) ||
    (col >= 21 && col < 22 && row >= 12 && row <= 15)
  ) {
    return 'stairs';
  }

  if (y >= FLOOR2_Y * 0.5) {
    if (col >= 16 && row >= 10 && row < 18) return 'library_mezzanine';
    if (col >= 3 && col < 11 && row >= 1 && row < 2) return 'endless_corridor';
    if (col < 3.5 && row >= 2 && row < 6.5) return 'cabin_1';
    if (col < 5.5 && row >= 14.5) return 'cabin_2';
    if (col >= 17.5 && row < 6.5) return 'cabin_3';
    if (col >= 17.5 && row >= 18.5) return 'master_bedroom';
    return 'upper_hall';
  }

  if (col >= 8 && col < 15 && row >= 11 && row < 18) return 'grand_ballroom';
  if (col >= 16 && row >= 10 && row < 18) return 'library_f1';
  if (col < 6 && row < 5.5) return 'boiler';
  if (col < 5.5 && row >= 7.5 && row < 12.5) return 'west_cellar';
  if (col < 5.5 && row >= 12.5 && row < 16) return 'pantry';
  if (col < 5.5 && row >= 16) return 'kitchen';
  if (col >= 16.5 && row < 5.5) return 'east_study';
  if (col >= 17.5 && row >= 18.5) return 'security';
  return 'entrance';
}

export const MAJOR_INSPECT_ZONES: ReadonlySet<ZoneId> = new Set([
  'grand_ballroom',
  'library_f1',
  'library_mezzanine',
  'kitchen',
  'boiler',
  'upper_hall',
]);

export const ITEM_CATALOG: Record<ItemId, ItemMeta> = {
  ward_key: {
    id: 'ward_key',
    name: 'Security Room Key',
    shortLabel: 'Sec Key',
    hint: 'Unlocks Floor 1 Security Storage Room',
    color: '#d4a64a',
  },
  valve_wheel: {
    id: 'valve_wheel',
    name: 'Cast-Iron Valve Wheel',
    shortLabel: 'Valve',
    hint: 'Shuts off scalding steam in Floor 1 Boiler Utility',
    color: '#c96f4b',
  },
  power_fuse: {
    id: 'power_fuse',
    name: 'High-Volt Fuse',
    shortLabel: 'Fuse',
    hint: 'Powers the Exit Lock at Boiler Breaker Box',
    color: '#5ec9a8',
  },
  bolt_cutters: {
    id: 'bolt_cutters',
    name: 'Heavy Bolt Cutters',
    shortLabel: 'Cutters',
    hint: 'Cuts the chains on the Entrance Exit Door',
    color: '#d95b50',
  },
};

export const INITIAL_DOORS: readonly DoorSpec[] = [
  {
    id: 'exit_doors',
    label: 'Entrance Exit Door',
    floor: 0,
    gridX: 11,
    gridZ: 22,
    widthTiles: 1,
    orientation: 'ew',
    initialState: 'locked_exit',
    requiredItem: 'bolt_cutters',
  },
  {
    id: 'security_door',
    label: 'Security Storage Door',
    floor: 0,
    gridX: 17,
    gridZ: 20,
    widthTiles: 1,
    orientation: 'ns',
    initialState: 'locked_key',
    requiredItem: 'ward_key',
  },
  {
    id: 'boiler_door',
    label: 'Boiler Utility Door',
    floor: 0,
    gridX: 3,
    gridZ: 5,
    widthTiles: 1,
    orientation: 'ew',
    initialState: 'closed',
  },
  {
    id: 'east_study_door',
    label: 'East Study Door',
    floor: 0,
    gridX: 19,
    gridZ: 5,
    widthTiles: 1,
    orientation: 'ew',
    initialState: 'closed',
  },
  {
    id: 'library_north_door',
    label: 'Library North Door',
    floor: 0,
    gridX: 18,
    gridZ: 9,
    widthTiles: 1,
    orientation: 'ew',
    initialState: 'closed',
  },
  {
    id: 'library_south_door',
    label: 'Library South Door',
    floor: 0,
    gridX: 16,
    gridZ: 18,
    widthTiles: 1,
    orientation: 'ew',
    initialState: 'closed',
  },
  {
    id: 'ballroom_west_door',
    label: 'Ballroom West Door',
    floor: 0,
    gridX: 7,
    gridZ: 14,
    widthTiles: 1,
    orientation: 'ns',
    initialState: 'closed',
  },
  {
    id: 'ballroom_library_door',
    label: 'Ballroom-Library Arch Door',
    floor: 0,
    gridX: 15,
    gridZ: 14,
    widthTiles: 1,
    orientation: 'ns',
    initialState: 'closed',
  },
  {
    id: 'pantry_door',
    label: 'Pantry Door',
    floor: 0,
    gridX: 5,
    gridZ: 14,
    widthTiles: 1,
    orientation: 'ns',
    initialState: 'closed',
  },
  {
    id: 'kitchen_north_door',
    label: 'Kitchen North Door',
    floor: 0,
    gridX: 5,
    gridZ: 17,
    widthTiles: 1,
    orientation: 'ns',
    initialState: 'closed',
  },
  {
    id: 'kitchen_south_door',
    label: 'Kitchen South Door',
    floor: 0,
    gridX: 5,
    gridZ: 20,
    widthTiles: 1,
    orientation: 'ns',
    initialState: 'closed',
  },
  // Floor 2 Doors
  {
    id: 'cabin1_door',
    label: 'Cabin 1 Door',
    floor: 1,
    gridX: 2,
    gridZ: 6,
    widthTiles: 1,
    orientation: 'ew',
    initialState: 'closed',
  },
  {
    id: 'cabin2_door',
    label: 'Cabin 2 Door',
    floor: 1,
    gridX: 5,
    gridZ: 17,
    widthTiles: 1,
    orientation: 'ns',
    initialState: 'closed',
  },
  {
    id: 'cabin3_door',
    label: 'Cabin 3 Door',
    floor: 1,
    gridX: 17,
    gridZ: 4,
    widthTiles: 1,
    orientation: 'ns',
    initialState: 'closed',
  },
  {
    id: 'master_door',
    label: 'Master Bedroom Door',
    floor: 1,
    gridX: 17,
    gridZ: 19,
    widthTiles: 1,
    orientation: 'ns',
    initialState: 'closed',
  },
];

export const ITEM_SPAWN_POINTS: readonly ItemSpawnPoint[] = [
  {
    id: 'f1_ballroom_table',
    floor: 0,
    zone: 'grand_ballroom',
    tier: 'open',
    x: 11.5 * TILE_SIZE,
    y: 0,
    z: 14.5 * TILE_SIZE,
    surfaceY: 0.85,
    hintLabel: 'Ballroom Side Table',
  },
  {
    id: 'f1_library_desk',
    floor: 0,
    zone: 'library_f1',
    tier: 'open',
    x: 18.5 * TILE_SIZE,
    y: 0,
    z: 16.5 * TILE_SIZE,
    surfaceY: 0.85,
    hintLabel: 'Library Reading Desk',
  },
  {
    id: 'f1_pantry_shelf',
    floor: 0,
    zone: 'pantry',
    tier: 'open',
    x: 2.0 * TILE_SIZE,
    y: 0,
    z: 14.5 * TILE_SIZE,
    surfaceY: 0.85,
    hintLabel: 'Pantry Shelf',
  },
  {
    id: 'f1_kitchen_counter',
    floor: 0,
    zone: 'kitchen',
    tier: 'open',
    x: 2.0 * TILE_SIZE,
    y: 0,
    z: 20.6 * TILE_SIZE,
    surfaceY: 0.85,
    hintLabel: 'Kitchen Side Table',
  },
  {
    id: 'f1_east_study_desk',
    floor: 0,
    zone: 'east_study',
    tier: 'open',
    x: 19.5 * TILE_SIZE,
    y: 0,
    z: 2.2 * TILE_SIZE,
    surfaceY: 0.85,
    hintLabel: 'East Study Desk',
  },
  {
    id: 'f1_boiler_bench',
    floor: 0,
    zone: 'boiler',
    tier: 'open',
    x: 4.8 * TILE_SIZE,
    y: 0,
    z: 1.8 * TILE_SIZE,
    surfaceY: 0.85,
    hintLabel: 'Boiler Bench',
  },
  {
    id: 'f1_security_desk',
    floor: 0,
    zone: 'security',
    tier: 'security_locked',
    x: 19.8 * TILE_SIZE,
    y: 0,
    z: 19.6 * TILE_SIZE,
    surfaceY: 0.85,
    hintLabel: 'Security Desk',
  },
  {
    id: 'f1_security_crate',
    floor: 0,
    zone: 'security',
    tier: 'security_locked',
    x: 20.4 * TILE_SIZE,
    y: 0,
    z: 21.2 * TILE_SIZE,
    surfaceY: 0.82,
    hintLabel: 'Storage Crate',
  },
  {
    id: 'f2_cabin1_desk',
    floor: 1,
    zone: 'cabin_1',
    tier: 'open',
    x: 1.7 * TILE_SIZE,
    y: FLOOR2_Y,
    z: 3.2 * TILE_SIZE,
    surfaceY: FLOOR2_Y + 0.82,
    hintLabel: 'Cabin 1 Stand',
  },
  {
    id: 'f2_cabin2_table',
    floor: 1,
    zone: 'cabin_2',
    tier: 'open',
    x: 2.2 * TILE_SIZE,
    y: FLOOR2_Y,
    z: 16.2 * TILE_SIZE,
    surfaceY: FLOOR2_Y + 0.82,
    hintLabel: 'Cabin 2 Table',
  },
  {
    id: 'f2_library_mezz_stand',
    floor: 1,
    zone: 'library_mezzanine',
    tier: 'open',
    x: 18.5 * TILE_SIZE,
    y: FLOOR2_Y,
    z: 10.6 * TILE_SIZE,
    surfaceY: FLOOR2_Y + 0.84,
    hintLabel: 'Mezzanine Lectern',
  },
  {
    id: 'f2_master_dresser',
    floor: 1,
    zone: 'master_bedroom',
    tier: 'open',
    x: 19.6 * TILE_SIZE,
    y: FLOOR2_Y,
    z: 21.2 * TILE_SIZE,
    surfaceY: FLOOR2_Y + 0.85,
    hintLabel: 'Master Dresser',
  },
];

export const INITIAL_GLASS_SHARDS: ReadonlyArray<Omit<GlassShardRuntime, 'collected'>> = [
  {
    id: 'shard_cabin3',
    floor: 1,
    zone: 'cabin_3',
    x: 20.2 * TILE_SIZE,
    y: FLOOR2_Y,
    z: 3.2 * TILE_SIZE,
    surfaceY: FLOOR2_Y + 0.84,
  },
  {
    id: 'shard_ballroom_balcony',
    floor: 0,
    zone: 'grand_ballroom',
    x: 9.2 * TILE_SIZE,
    y: 0,
    z: 16.4 * TILE_SIZE,
    surfaceY: 0.84,
  },
  {
    id: 'shard_library_atrium',
    floor: 0,
    zone: 'library_f1',
    x: 16.8 * TILE_SIZE,
    y: 0,
    z: 11.4 * TILE_SIZE,
    surfaceY: 0.84,
  },
  {
    id: 'shard_library_mezzanine',
    floor: 1,
    zone: 'library_mezzanine',
    x: 20.5 * TILE_SIZE,
    y: FLOOR2_Y,
    z: 16.5 * TILE_SIZE,
    surfaceY: FLOOR2_Y + 0.84,
  },
];

export const INITIAL_THROWABLES: ReadonlyArray<Omit<ThrowablePickupRuntime, 'collected'>> = [
  { id: 'throw_entrance', kind: 'bottle', label: 'Glass Bottle', floor: 0, x: 13.0 * TILE_SIZE, y: 0, z: 20.4 * TILE_SIZE, surfaceY: 0.14 },
  { id: 'throw_ballroom', kind: 'bottle', label: 'Glass Bottle', floor: 0, x: 13.9 * TILE_SIZE, y: 0, z: 12.0 * TILE_SIZE, surfaceY: 0.14 },
  { id: 'throw_kitchen', kind: 'can', label: 'Tin Can', floor: 0, x: 1.7 * TILE_SIZE, y: 0, z: 19.2 * TILE_SIZE, surfaceY: 0.14 },
  { id: 'throw_pantry', kind: 'can', label: 'Tin Can', floor: 0, x: 2.8 * TILE_SIZE, y: 0, z: 15.2 * TILE_SIZE, surfaceY: 0.14 },
  { id: 'throw_library_f1', kind: 'bottle', label: 'Glass Bottle', floor: 0, x: 16.6 * TILE_SIZE, y: 0, z: 15.1 * TILE_SIZE, surfaceY: 0.14 },
  { id: 'throw_boiler', kind: 'can', label: 'Tin Can', floor: 0, x: 4.8 * TILE_SIZE, y: 0, z: 3.4 * TILE_SIZE, surfaceY: 0.14 },
  { id: 'throw_upper_hall', kind: 'bottle', label: 'Glass Bottle', floor: 1, x: 15.1 * TILE_SIZE, y: FLOOR2_Y, z: 19.4 * TILE_SIZE, surfaceY: FLOOR2_Y + 0.14 },
  { id: 'throw_library_mezz', kind: 'can', label: 'Tin Can', floor: 1, x: 16.5 * TILE_SIZE, y: FLOOR2_Y, z: 16.6 * TILE_SIZE, surfaceY: FLOOR2_Y + 0.14 },
];

export const INITIAL_LORE_ITEMS: ReadonlyArray<Omit<LoreItemRuntime, 'inspected'>> = [
  {
    id: 'lore_diary_1',
    kind: 'diary',
    title: 'Torn Diary Page (Loop 14)',
    text: 'The doorway behind Cabin 3 seals into solid plaster the second you turn away. Look for the loose wardrobe backing.',
    floor: 0,
    x: 10.4 * TILE_SIZE,
    y: 0,
    z: 19.6 * TILE_SIZE,
    surfaceY: 0.05,
  },
  {
    id: 'lore_watch_1',
    kind: 'watch',
    title: 'Bloody Pocket Watch',
    text: 'Its brass hands tick violently backwards. Inside the lid is scratched: "ST. JUDE — DO NOT ANSWER THE HALLWAY PHONE."',
    floor: 0,
    x: 8.8 * TILE_SIZE,
    y: 0,
    z: 16.2 * TILE_SIZE,
    surfaceY: 0.05,
  },
  {
    id: 'lore_polaroid_1',
    kind: 'polaroid',
    title: 'Faded Kitchen Polaroid',
    text: 'A Polaroid of this exact kitchen. On the floor lies your own body from an earlier cycle—still clutching a glass bottle.',
    floor: 0,
    x: 4.1 * TILE_SIZE,
    y: 0,
    z: 21.1 * TILE_SIZE,
    surfaceY: 0.05,
  },
  {
    id: 'lore_diary_2',
    kind: 'diary',
    title: 'Torn Diary Page (Loop 29)',
    text: 'Her hollow crimson eyes cut straight through the mist before you hear the blade. Crouch beneath a cloth table if she enters.',
    floor: 0,
    x: 20.4 * TILE_SIZE,
    y: 0,
    z: 11.2 * TILE_SIZE,
    surfaceY: 0.05,
  },
  {
    id: 'lore_watch_2',
    kind: 'watch',
    title: 'Cracked Watch of the Quake',
    text: 'Stopped at midnight—the exact moment the Main Stairs collapsed. Only the West Cellar stairs stay standing after power returns.',
    floor: 1,
    x: 16.5 * TILE_SIZE,
    y: FLOOR2_Y,
    z: 13.0 * TILE_SIZE,
    surfaceY: FLOOR2_Y + 0.05,
  },
  {
    id: 'lore_polaroid_2',
    kind: 'polaroid',
    title: 'Mirror Reflection Polaroid',
    text: 'Taken over your own shoulder in a bathroom mirror: two piercing red pinpoints hover an inch behind your neck.',
    floor: 1,
    x: 18.6 * TILE_SIZE,
    y: FLOOR2_Y,
    z: 21.3 * TILE_SIZE,
    surfaceY: FLOOR2_Y + 0.05,
  },
];

export const INITIAL_ROTARY_PHONES: ReadonlyArray<Omit<RotaryPhoneRuntime, 'ringing' | 'answeredCount'>> = [
  {
    id: 'phone_endless_corridor',
    zone: 'endless_corridor',
    floor: 1,
    x: 5.8 * TILE_SIZE,
    y: FLOOR2_Y,
    z: 1.48 * TILE_SIZE,
    wallFacingYaw: 0,
    isLoopTrigger: true,
  },
  {
    id: 'phone_ballroom',
    zone: 'grand_ballroom',
    floor: 0,
    x: 14.82 * TILE_SIZE,
    y: 0,
    z: 12.6 * TILE_SIZE,
    wallFacingYaw: Math.PI / 2,
  },
  {
    id: 'phone_upper_hall',
    zone: 'upper_hall',
    floor: 1,
    x: 10.2 * TILE_SIZE,
    y: FLOOR2_Y,
    z: 20.82 * TILE_SIZE,
    wallFacingYaw: 0,
  },
];

export const HAUNTED_MIRRORS: readonly HauntedMirrorSpec[] = [
  {
    id: 'mirror_pantry',
    floor: 0,
    zone: 'pantry',
    x: 1.08 * TILE_SIZE,
    y: 0,
    z: 14.5 * TILE_SIZE,
    facingYaw: -Math.PI / 2,
  },
  {
    id: 'mirror_upper_hall',
    floor: 1,
    zone: 'upper_hall',
    x: 15.92 * TILE_SIZE,
    y: FLOOR2_Y,
    z: 3.5 * TILE_SIZE,
    facingYaw: Math.PI / 2,
  },
  {
    id: 'mirror_master',
    floor: 1,
    zone: 'master_bedroom',
    x: 21.92 * TILE_SIZE,
    y: FLOOR2_Y,
    z: 20.5 * TILE_SIZE,
    facingYaw: Math.PI / 2,
  },
];

export const STEAM_VALVE_POS = {
  floor: 0 as FloorIndex,
  x: 3.6 * TILE_SIZE,
  y: 0,
  z: 2.3 * TILE_SIZE,
};

export const BREAKER_BOX_POS = {
  floor: 0 as FloorIndex,
  x: 1.15 * TILE_SIZE,
  y: 0,
  z: 2.0 * TILE_SIZE,
  interactX: 1.65 * TILE_SIZE,
  interactZ: 2.0 * TILE_SIZE,
};

export const HIDE_SPOTS: readonly HideSpotSpec[] = [
  {
    id: 'hide_pantry_locker',
    kind: 'locker',
    label: 'Pantry Closet',
    floor: 0,
    zone: 'pantry',
    x: 1.55 * TILE_SIZE,
    y: 0,
    z: 13.6 * TILE_SIZE,
    facingAngle: -Math.PI / 2,
    eyeHeight: 1.44,
  },
  {
    id: 'hide_kitchen_wardrobe',
    kind: 'wardrobe',
    label: 'Kitchen Cupboard',
    floor: 0,
    zone: 'kitchen',
    x: 1.55 * TILE_SIZE,
    y: 0,
    z: 17.7 * TILE_SIZE,
    facingAngle: -Math.PI / 2,
    eyeHeight: 1.44,
  },
  {
    id: 'hide_boiler_locker',
    kind: 'locker',
    label: 'Boiler Locker',
    floor: 0,
    zone: 'boiler',
    x: 5.42 * TILE_SIZE,
    y: 0,
    z: 3.6 * TILE_SIZE,
    facingAngle: Math.PI / 2,
    eyeHeight: 1.44,
  },
  {
    id: 'hide_ballroom_wardrobe',
    kind: 'wardrobe',
    label: 'Ballroom Drape Cabinet',
    floor: 0,
    zone: 'grand_ballroom',
    x: 8.55 * TILE_SIZE,
    y: 0,
    z: 12.2 * TILE_SIZE,
    facingAngle: -Math.PI / 2,
    eyeHeight: 1.44,
  },
  {
    id: 'hide_library_locker',
    kind: 'locker',
    label: 'Library Archive Locker',
    floor: 0,
    zone: 'library_f1',
    x: 21.42 * TILE_SIZE,
    y: 0,
    z: 16.5 * TILE_SIZE,
    facingAngle: Math.PI / 2,
    eyeHeight: 1.44,
  },
  {
    id: 'hide_security_locker',
    kind: 'locker',
    label: 'Security Locker',
    floor: 0,
    zone: 'security',
    x: 21.42 * TILE_SIZE,
    y: 0,
    z: 20.5 * TILE_SIZE,
    facingAngle: Math.PI / 2,
    eyeHeight: 1.44,
  },
  {
    id: 'hide_cabin1_bed',
    kind: 'bed',
    label: 'Under Cabin 1 Bed',
    floor: 1,
    zone: 'cabin_1',
    x: 1.9 * TILE_SIZE,
    y: FLOOR2_Y,
    z: 4.8 * TILE_SIZE,
    facingAngle: 0,
    eyeHeight: 0.56,
  },
  {
    id: 'hide_cabin2_wardrobe',
    kind: 'wardrobe',
    label: 'Cabin 2 Wardrobe',
    floor: 1,
    zone: 'cabin_2',
    x: 1.55 * TILE_SIZE,
    y: FLOOR2_Y,
    z: 19.8 * TILE_SIZE,
    facingAngle: -Math.PI / 2,
    eyeHeight: 1.44,
  },
  {
    id: 'hide_cabin3_locker',
    kind: 'locker',
    label: 'Cabin 3 Closet',
    floor: 1,
    zone: 'cabin_3',
    x: 21.42 * TILE_SIZE,
    y: FLOOR2_Y,
    z: 2.6 * TILE_SIZE,
    facingAngle: Math.PI / 2,
    eyeHeight: 1.44,
  },
  {
    id: 'hide_master_bed',
    kind: 'bed',
    label: 'Under Master Bed',
    floor: 1,
    zone: 'master_bedroom',
    x: 21.0 * TILE_SIZE,
    y: FLOOR2_Y,
    z: 19.7 * TILE_SIZE,
    facingAngle: Math.PI / 2,
    eyeHeight: 0.56,
  },
];

/**
 * Wooden Dining Tables & Draped Medical Gurneys:
 * Standing players & The Resident collide around them; crouching players crawl underneath (Y=0.55m)!
 */
export const HIDE_TABLES: readonly HideTableSpec[] = [
  {
    id: 'table_ballroom_dining',
    label: 'Draped Ballroom Table',
    floor: 0,
    zone: 'grand_ballroom',
    minX: 10.1 * TILE_SIZE,
    maxX: 11.1 * TILE_SIZE,
    minZ: 15.6 * TILE_SIZE,
    maxZ: 16.5 * TILE_SIZE,
    kind: 'dining',
  },
  {
    id: 'table_kitchen_gurney',
    label: 'Cloth Kitchen Table',
    floor: 0,
    zone: 'kitchen',
    minX: 3.1 * TILE_SIZE,
    maxX: 3.95 * TILE_SIZE,
    minZ: 20.6 * TILE_SIZE,
    maxZ: 21.5 * TILE_SIZE,
    kind: 'gurney',
  },
  {
    id: 'table_library_reading',
    label: 'Library Reading Table',
    floor: 0,
    zone: 'library_f1',
    minX: 17.1 * TILE_SIZE,
    maxX: 17.95 * TILE_SIZE,
    minZ: 10.35 * TILE_SIZE,
    maxZ: 11.25 * TILE_SIZE,
    kind: 'dining',
  },
  {
    id: 'table_east_study',
    label: 'Draped Medical Gurney',
    floor: 0,
    zone: 'east_study',
    minX: 17.3 * TILE_SIZE,
    maxX: 18.2 * TILE_SIZE,
    minZ: 2.1 * TILE_SIZE,
    maxZ: 3.3 * TILE_SIZE,
    kind: 'gurney',
  },
  {
    id: 'table_upper_hall',
    label: 'Gallery Cloth Table',
    floor: 1,
    zone: 'upper_hall',
    minX: 11.2 * TILE_SIZE,
    maxX: 12.4 * TILE_SIZE,
    minZ: 19.65 * TILE_SIZE,
    maxZ: 20.55 * TILE_SIZE,
    kind: 'gurney',
  },
  {
    id: 'table_cabin2_dining',
    label: 'Cabin 2 Dining Table',
    floor: 1,
    zone: 'cabin_2',
    minX: 3.2 * TILE_SIZE,
    maxX: 4.1 * TILE_SIZE,
    minZ: 18.0 * TILE_SIZE,
    maxZ: 19.2 * TILE_SIZE,
    kind: 'dining',
  },
];

export const CREAKY_FLOORS: readonly CreakyFloorZone[] = [
  {
    id: 'creak_entrance_hall',
    floor: 0,
    minX: 11.1 * TILE_SIZE,
    maxX: 11.9 * TILE_SIZE,
    minZ: 18.6 * TILE_SIZE,
    maxZ: 20.2 * TILE_SIZE,
  },
  {
    id: 'creak_ballroom_center',
    floor: 0,
    minX: 10.6 * TILE_SIZE,
    maxX: 12.4 * TILE_SIZE,
    minZ: 12.2 * TILE_SIZE,
    maxZ: 13.4 * TILE_SIZE,
  },
  {
    id: 'creak_upper_south',
    floor: 1,
    minX: 9.2 * TILE_SIZE,
    maxX: 12.8 * TILE_SIZE,
    minZ: 19.2 * TILE_SIZE,
    maxZ: 19.9 * TILE_SIZE,
  },
];

export const INITIAL_KNOCKABLES: ReadonlyArray<{
  id: string;
  label: string;
  floor: FloorIndex;
  x: number;
  y: number;
  z: number;
}> = [
  { id: 'cart_kitchen', label: 'Kitchen Tray Cart', floor: 0, x: 4.4 * TILE_SIZE, y: 0, z: 19.4 * TILE_SIZE },
  { id: 'bucket_boiler', label: 'Rusted Bucket', floor: 0, x: 4.5 * TILE_SIZE, y: 0, z: 3.8 * TILE_SIZE },
  { id: 'vase_ballroom', label: 'Porcelain Urn', floor: 0, x: 13.6 * TILE_SIZE, y: 0, z: 16.4 * TILE_SIZE },
  { id: 'vase_upper', label: 'Gallery Urn', floor: 1, x: 15.4 * TILE_SIZE, y: FLOOR2_Y, z: 5.5 * TILE_SIZE },
];

/**
 * Solid Furniture, Boiler Tank, Pillars, Bookshelves & Mezzanine Guardrails.
 * Every blocksThreat box stops The Resident cleanly with zero visual clipping!
 */
export const FURNITURE_OBSTACLES: readonly ObstacleBox[] = [
  {
    id: 'kitchen_island_counter',
    floor: 0,
    minX: 2.15 * TILE_SIZE,
    maxX: 3.75 * TILE_SIZE,
    minZ: 18.1 * TILE_SIZE,
    maxZ: 19.9 * TILE_SIZE,
    blocksSight: true,
    blocksThreat: true,
  },
  {
    id: 'boiler_tank_box',
    floor: 0,
    minX: 1.75 * TILE_SIZE,
    maxX: 2.65 * TILE_SIZE,
    minZ: 1.55 * TILE_SIZE,
    maxZ: 2.45 * TILE_SIZE,
    blocksSight: true,
    blocksThreat: true,
  },
  // Grand Ballroom 4 Marble Pillars
  {
    id: 'ballroom_pillar_nw',
    floor: 0,
    minX: 9.25 * TILE_SIZE,
    maxX: 9.85 * TILE_SIZE,
    minZ: 12.25 * TILE_SIZE,
    maxZ: 12.85 * TILE_SIZE,
    blocksSight: true,
    blocksThreat: true,
  },
  {
    id: 'ballroom_pillar_ne',
    floor: 0,
    minX: 13.15 * TILE_SIZE,
    maxX: 13.75 * TILE_SIZE,
    minZ: 12.25 * TILE_SIZE,
    maxZ: 12.85 * TILE_SIZE,
    blocksSight: true,
    blocksThreat: true,
  },
  {
    id: 'ballroom_pillar_sw',
    floor: 0,
    minX: 9.25 * TILE_SIZE,
    maxX: 9.85 * TILE_SIZE,
    minZ: 16.15 * TILE_SIZE,
    maxZ: 16.75 * TILE_SIZE,
    blocksSight: true,
    blocksThreat: true,
  },
  {
    id: 'ballroom_pillar_se',
    floor: 0,
    minX: 13.15 * TILE_SIZE,
    maxX: 13.75 * TILE_SIZE,
    minZ: 16.15 * TILE_SIZE,
    maxZ: 16.75 * TILE_SIZE,
    blocksSight: true,
    blocksThreat: true,
  },
  // Grand Ballroom Dusty Sheet-Covered Furniture
  {
    id: 'ballroom_sheeted_table',
    floor: 0,
    minX: 10.95 * TILE_SIZE,
    maxX: 12.05 * TILE_SIZE,
    minZ: 14.0 * TILE_SIZE,
    maxZ: 15.0 * TILE_SIZE,
    blocksSight: false,
    blocksThreat: true,
  },
  {
    id: 'ballroom_sheeted_sofa_w',
    floor: 0,
    minX: 8.85 * TILE_SIZE,
    maxX: 9.65 * TILE_SIZE,
    minZ: 14.1 * TILE_SIZE,
    maxZ: 15.2 * TILE_SIZE,
    blocksSight: false,
    blocksThreat: true,
  },
  {
    id: 'ballroom_sheeted_sofa_e',
    floor: 0,
    minX: 13.35 * TILE_SIZE,
    maxX: 14.15 * TILE_SIZE,
    minZ: 14.1 * TILE_SIZE,
    maxZ: 15.2 * TILE_SIZE,
    blocksSight: false,
    blocksThreat: true,
  },
  // Library Floor 1 Tall Maze Bookshelves
  {
    id: 'library_shelf_1',
    floor: 0,
    minX: 17.45 * TILE_SIZE,
    maxX: 19.65 * TILE_SIZE,
    minZ: 11.7 * TILE_SIZE,
    maxZ: 12.3 * TILE_SIZE,
    blocksSight: true,
    blocksThreat: true,
  },
  {
    id: 'library_shelf_2',
    floor: 0,
    minX: 17.45 * TILE_SIZE,
    maxX: 19.65 * TILE_SIZE,
    minZ: 13.7 * TILE_SIZE,
    maxZ: 14.3 * TILE_SIZE,
    blocksSight: true,
    blocksThreat: true,
  },
  {
    id: 'library_shelf_3',
    floor: 0,
    minX: 17.45 * TILE_SIZE,
    maxX: 19.65 * TILE_SIZE,
    minZ: 15.7 * TILE_SIZE,
    maxZ: 16.3 * TILE_SIZE,
    blocksSight: true,
    blocksThreat: true,
  },
  {
    id: 'library_stair_bookcase',
    floor: 0,
    minX: 20.15 * TILE_SIZE,
    maxX: 20.95 * TILE_SIZE,
    minZ: 12.1 * TILE_SIZE,
    maxZ: 14.9 * TILE_SIZE,
    blocksSight: true,
    blocksThreat: true,
  },
  // Floor 2 Library Atrium Open Pit Guardrail & Stair Rail
  {
    id: 'library_mezzanine_void_rail',
    floor: 1,
    minX: 17.02 * TILE_SIZE,
    maxX: 19.98 * TILE_SIZE,
    minZ: 12.02 * TILE_SIZE,
    maxZ: 15.98 * TILE_SIZE,
    blocksSight: false,
    blocksThreat: true,
  },
  {
    id: 'library_f2_stair_guard',
    floor: 1,
    minX: 20.88 * TILE_SIZE,
    maxX: 21.05 * TILE_SIZE,
    minZ: 12.02 * TILE_SIZE,
    maxZ: 14.98 * TILE_SIZE,
    blocksSight: false,
    blocksThreat: true,
  },
  // Cabin Beds
  {
    id: 'cabin1_bed_box',
    floor: 1,
    minX: 1.25 * TILE_SIZE,
    maxX: 2.55 * TILE_SIZE,
    minZ: 4.35 * TILE_SIZE,
    maxZ: 5.25 * TILE_SIZE,
    blocksSight: false,
    blocksThreat: true,
  },
  {
    id: 'master_bed_box',
    floor: 1,
    minX: 20.45 * TILE_SIZE,
    maxX: 21.55 * TILE_SIZE,
    minZ: 19.15 * TILE_SIZE,
    maxZ: 20.25 * TILE_SIZE,
    blocksSight: false,
    blocksThreat: true,
  },
];

// Endless Loop Corridor Bounds (Floor 2 Row 1, cols 3..8 — Rotary Phone breaks the shifting wall at col 9!)
export const ENDLESS_CORRIDOR_BOUNDS = {
  floor: 1 as FloorIndex,
  minX: 3.1 * TILE_SIZE,
  maxX: 8.4 * TILE_SIZE,
  minZ: 1.0 * TILE_SIZE,
  maxZ: 2.0 * TILE_SIZE,
  loopThresholdX: 4.3 * TILE_SIZE,
  loopResetDeltaX: 4.0 * TILE_SIZE,
  shiftingWallGridX: 9,
  shiftingWallGridZ: 1,
};

export const PLAYER_SPAWN = {
  x: 11.5 * TILE_SIZE,
  y: 0,
  z: 21.2 * TILE_SIZE,
  yaw: 0,
};

/**
 * Valid randomized start/rebirth rooms across the estate (all verified open & connected).
 */
export const RANDOM_SPAWN_POINTS: ReadonlyArray<{
  id: string;
  zone: ZoneId;
  floor: FloorIndex;
  x: number;
  y: number;
  z: number;
  yaw: number;
}> = [
  { id: 'spawn_entrance', zone: 'entrance', floor: 0, x: 11.5 * TILE_SIZE, y: 0, z: 21.2 * TILE_SIZE, yaw: 0 },
  { id: 'spawn_library', zone: 'library_f1', floor: 0, x: 19.5 * TILE_SIZE, y: 0, z: 10.6 * TILE_SIZE, yaw: Math.PI / 2 },
  { id: 'spawn_pantry', zone: 'pantry', floor: 0, x: 3.5 * TILE_SIZE, y: 0, z: 14.5 * TILE_SIZE, yaw: -Math.PI / 2 },
  { id: 'spawn_kitchen', zone: 'kitchen', floor: 0, x: 4.0 * TILE_SIZE, y: 0, z: 17.5 * TILE_SIZE, yaw: -Math.PI / 2 },
  { id: 'spawn_cabin1', zone: 'cabin_1', floor: 1, x: 1.8 * TILE_SIZE, y: FLOOR2_Y, z: 3.6 * TILE_SIZE, yaw: Math.PI },
  { id: 'spawn_cabin2', zone: 'cabin_2', floor: 1, x: 2.8 * TILE_SIZE, y: FLOOR2_Y, z: 16.5 * TILE_SIZE, yaw: -Math.PI / 2 },
  { id: 'spawn_master', zone: 'master_bedroom', floor: 1, x: 19.2 * TILE_SIZE, y: FLOOR2_Y, z: 20.5 * TILE_SIZE, yaw: Math.PI / 2 },
];

export const THREAT_SPAWN = {
  x: 16.5 * TILE_SIZE,
  y: FLOOR2_Y,
  z: 10.5 * TILE_SIZE,
  yaw: 0,
};

export const THREAT_PATROL_WAYPOINTS: ReadonlyArray<{ x: number; y: number; z: number }> = [
  { x: 16.5 * TILE_SIZE, y: FLOOR2_Y, z: 10.5 * TILE_SIZE },
  { x: 14.5 * TILE_SIZE, y: FLOOR2_Y, z: 4.5 * TILE_SIZE },
  { x: 12.5 * TILE_SIZE, y: FLOOR2_Y, z: 1.5 * TILE_SIZE },
  { x: 11.5 * TILE_SIZE, y: 0, z: 14.5 * TILE_SIZE },
  { x: 18.5 * TILE_SIZE, y: 0, z: 15.0 * TILE_SIZE },
  { x: 18.5 * TILE_SIZE, y: 0, z: 8.5 * TILE_SIZE },
  { x: 8.5 * TILE_SIZE, y: 0, z: 6.5 * TILE_SIZE },
  { x: 3.5 * TILE_SIZE, y: 0, z: 2.8 * TILE_SIZE },
  { x: 3.5 * TILE_SIZE, y: 0, z: 19.5 * TILE_SIZE },
  { x: 11.5 * TILE_SIZE, y: 0, z: 19.5 * TILE_SIZE },
  { x: 11.5 * TILE_SIZE, y: FLOOR2_Y, z: 19.5 * TILE_SIZE },
];
