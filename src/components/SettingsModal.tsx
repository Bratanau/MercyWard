import React from 'react';
import { DEFAULT_SETTINGS, GameSettings } from '../game/settings';

interface SettingsModalProps {
  settings: GameSettings;
  onChange: (next: GameSettings) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onChange,
  onClose,
}) => {
  const update = <K extends keyof GameSettings>(key: K, value: GameSettings[K]) => {
    onChange({ ...settings, [key]: value });
  };

  return (
    <div
      data-testid="settings-modal"
      className="fixed inset-0 z-40 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(4, 7, 5, 0.86)' }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-xl border border-[#324638] p-5 sm:p-6 shadow-2xl"
        style={{ backgroundColor: '#0e1712' }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#7ea085]">
              Configuration
            </p>
            <h2 id="settings-title" className="mt-1 font-display text-2xl sm:text-3xl font-bold text-[#e3ede3]">
              Settings
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onChange({ ...DEFAULT_SETTINGS })}
            className="min-h-[36px] px-3 rounded-lg border border-[#2f4235] hover:border-[#4c6b56] text-xs font-medium text-[#b2c4b5] transition-colors cursor-pointer"
          >
            Reset Defaults
          </button>
        </div>

        <div className="mt-5 space-y-4 text-sm">
          {/* Monster Speed */}
          <div>
            <div className="flex justify-between text-xs sm:text-sm text-[#d2dfd4]">
              <label htmlFor="set-monster-speed">The Resident Speed</label>
              <span className="font-mono-tabular text-[#89d498]">
                {Math.round(settings.monsterSpeedMult * 100)}%
              </span>
            </div>
            <input
              id="set-monster-speed"
              type="range"
              min={50}
              max={150}
              step={5}
              value={Math.round(settings.monsterSpeedMult * 100)}
              onChange={(e) => update('monsterSpeedMult', Number(e.target.value) / 100)}
              className="mt-1.5 w-full accent-[#69b879] cursor-pointer"
            />
          </div>

          {/* Spectral Glasses Cooldown */}
          <div>
            <div className="flex justify-between text-xs sm:text-sm text-[#d2dfd4]">
              <label htmlFor="set-glasses-cd">Spectral Glasses Cooldown</label>
              <span className="font-mono-tabular text-[#75ebff]">
                {settings.glassesCooldownSec}s
              </span>
            </div>
            <input
              id="set-glasses-cd"
              type="range"
              min={10}
              max={45}
              step={1}
              value={settings.glassesCooldownSec}
              onChange={(e) => update('glassesCooldownSec', Number(e.target.value))}
              className="mt-1.5 w-full accent-[#5ad8e8] cursor-pointer"
            />
          </div>

          {/* Flashlight Intensity */}
          <div>
            <div className="flex justify-between text-xs sm:text-sm text-[#d2dfd4]">
              <label htmlFor="set-flash-int">Flashlight Intensity</label>
              <span className="font-mono-tabular text-[#e4d599]">
                {Math.round(settings.flashlightIntensity * 100)}%
              </span>
            </div>
            <input
              id="set-flash-int"
              type="range"
              min={50}
              max={160}
              step={5}
              value={Math.round(settings.flashlightIntensity * 100)}
              onChange={(e) => update('flashlightIntensity', Number(e.target.value) / 100)}
              className="mt-1.5 w-full accent-[#d4a64a] cursor-pointer"
            />
          </div>

          {/* Flashlight Battery Lifetime */}
          <div>
            <div className="flex justify-between text-xs sm:text-sm text-[#d2dfd4]">
              <label htmlFor="set-flash-bat">Flashlight Battery Lifetime</label>
              <span className="font-mono-tabular text-[#e4d599]">
                {settings.flashlightBatterySec}s
              </span>
            </div>
            <input
              id="set-flash-bat"
              type="range"
              min={30}
              max={180}
              step={10}
              value={settings.flashlightBatterySec}
              onChange={(e) => update('flashlightBatterySec', Number(e.target.value))}
              className="mt-1.5 w-full accent-[#d4a64a] cursor-pointer"
            />
          </div>

          {/* SFX Volume */}
          <div>
            <div className="flex justify-between text-xs sm:text-sm text-[#d2dfd4]">
              <label htmlFor="set-sfx-vol">Sound FX Volume</label>
              <span className="font-mono-tabular text-[#89d498]">
                {Math.round(settings.sfxVolume * 100)}%
              </span>
            </div>
            <input
              id="set-sfx-vol"
              type="range"
              min={0}
              max={100}
              step={5}
              value={Math.round(settings.sfxVolume * 100)}
              onChange={(e) => update('sfxVolume', Number(e.target.value) / 100)}
              className="mt-1.5 w-full accent-[#69b879] cursor-pointer"
            />
          </div>

          {/* Ambient Music Volume */}
          <div>
            <div className="flex justify-between text-xs sm:text-sm text-[#d2dfd4]">
              <label htmlFor="set-amb-vol">Ambient Audio Volume</label>
              <span className="font-mono-tabular text-[#89d498]">
                {Math.round(settings.ambientVolume * 100)}%
              </span>
            </div>
            <input
              id="set-amb-vol"
              type="range"
              min={0}
              max={100}
              step={5}
              value={Math.round(settings.ambientVolume * 100)}
              onChange={(e) => update('ambientVolume', Number(e.target.value) / 100)}
              className="mt-1.5 w-full accent-[#69b879] cursor-pointer"
            />
          </div>

          {/* Field of View */}
          <div>
            <div className="flex justify-between text-xs sm:text-sm text-[#d2dfd4]">
              <label htmlFor="set-fov">Field of View (FOV)</label>
              <span className="font-mono-tabular text-[#c8d8cb]">
                {settings.fov}°
              </span>
            </div>
            <input
              id="set-fov"
              type="range"
              min={65}
              max={95}
              step={1}
              value={settings.fov}
              onChange={(e) => update('fov', Number(e.target.value))}
              className="mt-1.5 w-full accent-[#69b879] cursor-pointer"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-6 min-h-[46px] w-full rounded-lg bg-[#69b879] hover:bg-[#7ccc8c] text-[#08120a] font-semibold text-sm transition-colors cursor-pointer"
        >
          Done
        </button>
      </div>
    </div>
  );
};
