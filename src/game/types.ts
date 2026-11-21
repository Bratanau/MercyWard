export type GamePhase = 'title' | 'playing' | 'paused' | 'jumpscare' | 'rebirth' | 'gameover';

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
  phoneSpawned: boolean;
  midnightQuakeTriggered: boolean;
  dreamRoomTimer: number;
  dreamLastDoorId: string | null;
  dreamShiftCount: number;
  gridOverrides: Record<string, '#' | '.'>;
}

export type HideSpotKind = 'locker' | 'wardrobe' | 'bed' | 'table';

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

export interface HideTableSpec {
  id: string;
  label: string;
  floor: FloorIndex;
  zone: ZoneId;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  kind: 'dining' | 'gurney';
}

export interface ObstacleBox {
  id: string;
  floor: FloorIndex;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  blocksSight?: boolean;
  blocksThreat?: boolean;
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

export interface ThrowablePickupRuntime {
  id: string;
  kind: 'bottle' | 'can';
  label: string;
  floor: FloorIndex;
  x: number;
  y: number;
  z: number;
  surfaceY: number;
  collected: boolean;
}

export interface ThrownProjectile {
  id: number;
  kind: 'bottle' | 'can';
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  floor: FloorIndex;
}

export type LoreKind = 'diary' | 'watch' | 'polaroid';

export interface LoreItemRuntime {
  id: string;
  kind: LoreKind;
  title: string;
  text: string;
  floor: FloorIndex;
  x: number;
  y: number;
  z: number;
  surfaceY: number;
  inspected: boolean;
}

export interface RotaryPhoneRuntime {
  id: string;
  zone: ZoneId;
  floor: FloorIndex;
  x: number;
  y: number;
  z: number;
  wallFacingYaw: number;
  ringing: boolean;
  answeredCount: number;
  isLoopTrigger?: boolean;
}

export interface HauntedMirrorSpec {
  id: string;
  floor: FloorIndex;
  zone: ZoneId;
  x: number;
  y: number;
  z: number;
  facingYaw: number;
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
  sawUnderTableId: string | null;
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

export interface ParanoiaState {
  noTurnTimer: number;
  ghostFootstepsCooldown: number;
  ghostFootstepsActive: boolean;
  ghostEyeFlashTimer: number;
  ghostEyeX: number;
  ghostEyeY: number;
  ghostEyeZ: number;
  mirrorHauntTimer: number;
  mirrorHauntedId: string | null;
  mirrorLagYaw: number;
  radioWhisperCooldown: number;
  radioMessage: string | null;
  radioMessageTimer: number;
  phoneRingCooldown: number;
}

export interface PlayerState {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  crouching: boolean;
  isUnderTable: boolean;
  underTableId: string | null;
  sprinting: boolean;
  hidingSpotId: string | null;
  stamina: number;
  flashlightOn: boolean;
  battery: number; // 0..100
  bottlesCount: number;
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
  isUnderTable: boolean;
  hiding: boolean;
  hidingKind: HideSpotKind | null;
  currentFloor: 1 | 2;
  steamShutOff: boolean;
  powerRestored: boolean;
  inventory: ItemId[];
  selectedSlot: number;
  bottlesCount: number;
  flashlightOn: boolean;
  battery: number;
  currentZone: ZoneId;
  objectiveText: string;
  promptText: string | null;
  promptActionable: boolean;
  dangerLevel: number;
  radioStaticLevel: number;
  radioMessage: string | null;
  threatMode: ThreatMode;
  roomsUnlocked: number;
  itemsFound: number;
  loreFound: number;
  loreTotal: number;
  damageFlash: number;
  statusBanner: string | null;
  echoNoteText: string | null;
  loreOverlay: { title: string; kind: LoreKind; text: string } | null;
  jumpscareProgress: number;
  rebirthProgress: number;
  glassesActive: boolean;
  glassesTimeLeft: number;
  glassesCooldownLeft: number;
  glassesCooldownMax: number;
  glassShardsCollected: number;
  quakeTriggered: boolean;
  endlessLoopActive: boolean;
  cabin3Sealed: boolean;
  phoneRinging: boolean;
}
