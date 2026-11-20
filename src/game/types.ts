export type GamePhase = 'title' | 'playing' | 'paused' | 'jumpscare' | 'gameover';

export type ItemId = 'ward_key' | 'valve_wheel' | 'power_fuse' | 'bolt_cutters';

export interface ItemMeta {
  id: ItemId;
  name: string;
  shortLabel: string;
  hint: string;
  color: string;
}

export type ZoneId =
  | 'entrance'
  | 'grand_ballroom'
  | 'library_f1'
  | 'library_mezzanine'
  | 'kitchen'
  | 'pantry'
  | 'boiler'
  | 'west_cellar'
  | 'security'
  | 'east_study'
  | 'stairs'
  | 'upper_hall'
  | 'endless_corridor'
  | 'cabin_1'
  | 'cabin_2'
  | 'cabin_3'
  | 'master_bedroom';

export type FloorIndex = 0 | 1;

export type DoorState = 'open' | 'closed' | 'locked_key' | 'locked_exit';

export interface DoorSpec {
  id: string;
  label: string;
  floor: FloorIndex;
  gridX: number;
  gridZ: number;
  widthTiles: number;
  orientation: 'ns' | 'ew';
  initialState: DoorState;
  requiredItem?: ItemId;
}

export interface DoorRuntime {
  id: string;
  label: string;
  floor: FloorIndex;
  gridX: number;
  gridZ: number;
  widthTiles: number;
  orientation: 'ns' | 'ew';
  state: DoorState;
  requiredItem?: ItemId;
  openProgress: number;
}

export interface ItemSpawnPoint {
  id: string;
  floor: FloorIndex;
  zone: ZoneId;
  tier: 'open' | 'security_locked';
  x: number;
  y: number;
  z: number;
  surfaceY: number;
  hintLabel: string;
}

export interface WorldItemRuntime {
  id: ItemId;
  spawnId: string;
  floor: FloorIndex;
  x: number;
  y: number;
  z: number;
  surfaceY: number;
  collected: boolean;
}

export interface GlassShardRuntime {
  id: string;
  floor: FloorIndex;
  zone: ZoneId;
  x: number;
  y: number;
  z: number;
  surfaceY: number;
  collected: boolean;
}

export interface GlassesState {
  active: boolean;
  activeTimer: number;
  cooldownTimer: number;
  shardsCollected: number;
}

export interface ArchitectureShiftState {
  cabin3PickupTaken: boolean;
  cabin3Sealed: boolean;
  cabin3SecretOpen: boolean;
  endlessLoopActive: boolean;
  endlessLoopSolved: boolean;
  redDoorAppeared: boolean;
  midnightQuakeTriggered: boolean;
  gridOverrides: Record<string, '#' | '.'>;
}

export type HideSpotKind = 'locker' | 'wardrobe' | 'bed';

export interface HideSpotSpec {
  id: string;
  kind: HideSpotKind;
  label: string;
  floor: FloorIndex;
  zone: ZoneId;
  x: number;
  y: number;
  z: number;
  facingAngle: number;
  eyeHeight: number;
}

export interface ObstacleBox {
  id: string;
  floor: FloorIndex;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  blocksSight?: boolean;
}

export interface CreakyFloorZone {
  id: string;
  floor: FloorIndex;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface KnockablePropRuntime {
  id: string;
  label: string;
  floor: FloorIndex;
  x: number;
  y: number;
  z: number;
  knocked: boolean;
}

export type ThreatMode =
  | 'patrol'
  | 'sniff'
  | 'investigate'
  | 'chase'
  | 'search'
  | 'inspect_room'
  | 'check_locker'
  | 'smash_door';

export interface ThreatState {
  x: number;
  y: number;
  z: number;
  yaw: number;
  mode: ThreatMode;
  targetX: number;
  targetY: number;
  targetZ: number;
  waypoints: Array<{ x: number; y: number; z: number }>;
  patrolIndex: number;
  searchTimer: number;
  sniffTimer: number;
  smashTimer: number;
  roomInspectTimer: number;
  lastInspectedZone: ZoneId | null;
  smashingDoorId: string | null;
  postSmashMode: 'patrol' | 'investigate' | 'chase';
  headTilt: number;
  headTwitch: number;
  stepAccum: number;
  hitCooldown: number;
  alertFlash: number;
  sawPlayerHideId: string | null;
  checkingHideId: string | null;
}

export interface EchoRecord {
  loopNumber: number;
  deathX: number;
  deathY: number;
  deathZ: number;
  noteText: string;
  inspected: boolean;
}

export interface PhantomEchoState {
  active: boolean;
  x: number;
  y: number;
  z: number;
  startX: number;
  startZ: number;
  endX: number;
  endZ: number;
  progress: number;
  cooldown: number;
  yaw: number;
}

export interface PlayerState {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  crouching: boolean;
  sprinting: boolean;
  hidingSpotId: string | null;
  stamina: number;
  strikesRemaining: number;
  invulnTimer: number;
  noiseLevel: number;
  stepAccum: number;
  creakCooldown: number;
}

export interface GameHudSnapshot {
  phase: GamePhase;
  victory: boolean;
  loopCount: number;
  elapsedSeconds: number;
  strikesRemaining: number;
  maxStrikes: number;
  stamina: number;
  crouching: boolean;
  hiding: boolean;
  hidingKind: HideSpotKind | null;
  currentFloor: 1 | 2;
  steamShutOff: boolean;
  powerRestored: boolean;
  inventory: ItemId[];
  selectedSlot: number;
  currentZone: ZoneId;
  objectiveText: string;
  promptText: string | null;
  promptActionable: boolean;
  dangerLevel: number;
  threatMode: ThreatMode;
  roomsUnlocked: number;
  itemsFound: number;
  damageFlash: number;
  statusBanner: string | null;
  echoNoteText: string | null;
  jumpscareProgress: number;
  glassesActive: boolean;
  glassesTimeLeft: number;
  glassesCooldownLeft: number;
  glassesCooldownMax: number;
  glassShardsCollected: number;
  quakeTriggered: boolean;
  endlessLoopActive: boolean;
  cabin3Sealed: boolean;
}
