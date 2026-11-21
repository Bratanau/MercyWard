export interface GameSettings {
  monsterSpeedMult: number; // 0.5 .. 1.5
  glassesCooldownSec: number; // 10 .. 45
  flashlightIntensity: number; // 0.5 .. 1.6
  flashlightBatterySec: number; // 30 .. 180
  sfxVolume: number; // 0 .. 1
  ambientVolume: number; // 0 .. 1
  fov: number; // 65 .. 95
}

export const SETTINGS_STORAGE_KEY = 'mercy_ward_settings_v1';

export const DEFAULT_SETTINGS: GameSettings = {
  monsterSpeedMult: 1.0,
  glassesCooldownSec: 25,
  flashlightIntensity: 1.0,
  flashlightBatterySec: 90,
  sfxVolume: 0.75,
  ambientVolume: 0.65,
  fov: 70,
};

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function sanitizeSettings(raw: Partial<GameSettings> | null | undefined): GameSettings {
  const s = raw ?? {};
  return {
    monsterSpeedMult: clamp(Number(s.monsterSpeedMult ?? DEFAULT_SETTINGS.monsterSpeedMult) || 1.0, 0.5, 1.5),
    glassesCooldownSec: Math.round(clamp(Number(s.glassesCooldownSec ?? DEFAULT_SETTINGS.glassesCooldownSec) || 25, 10, 45)),
    flashlightIntensity: clamp(Number(s.flashlightIntensity ?? DEFAULT_SETTINGS.flashlightIntensity) || 1.0, 0.5, 1.6),
    flashlightBatterySec: Math.round(clamp(Number(s.flashlightBatterySec ?? DEFAULT_SETTINGS.flashlightBatterySec) || 90, 30, 180)),
    sfxVolume: clamp(Number.isFinite(s.sfxVolume) ? Number(s.sfxVolume) : DEFAULT_SETTINGS.sfxVolume, 0, 1),
    ambientVolume: clamp(Number.isFinite(s.ambientVolume) ? Number(s.ambientVolume) : DEFAULT_SETTINGS.ambientVolume, 0, 1),
    fov: Math.round(clamp(Number(s.fov ?? DEFAULT_SETTINGS.fov) || 70, 65, 95)),
  };
}

export function loadSettings(storage?: Pick<Storage, 'getItem'> | null): GameSettings {
  const target = storage ?? (typeof window !== 'undefined' ? window.localStorage : null);
  if (!target) return { ...DEFAULT_SETTINGS };
  try {
    const raw = target.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return sanitizeSettings(JSON.parse(raw) as Partial<GameSettings>);
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(
  settings: GameSettings,
  storage?: Pick<Storage, 'setItem'> | null
): GameSettings {
  const clean = sanitizeSettings(settings);
  const target = storage ?? (typeof window !== 'undefined' ? window.localStorage : null);
  if (target) {
    try {
      target.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(clean));
    } catch {
      // ignore storage quota errors
    }
  }
  return clean;
}
