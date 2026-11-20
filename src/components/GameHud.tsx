import React from 'react';
import { ITEM_CATALOG } from '../game/mapData';
import { GameHudSnapshot, ZoneId } from '../game/types';
import {
  ItemSvgIcon,
  PauseIconSvg,
  RestartIconSvg,
  SoundIconSvg,
  SpectralGlassesSvg,
  VitalityPipSvg,
} from './GameIcons';
import { MobileControlState } from './HospitalViewport';
import { MobileControls } from './MobileControls';

interface GameHudProps {
  hud: GameHudSnapshot;
  muted: boolean;
  mobileInputRef: React.MutableRefObject<MobileControlState>;
  onToggleMute: () => void;
  onPause: () => void;
  onRestart: () => void;
  onInteract: () => void;
  onCrouch: () => void;
  onGlasses: () => void;
  onSelectSlot: (idx: number) => void;
}

function formatTimer(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function formatZone(zone: ZoneId): string {
  switch (zone) {
    case 'entrance':
      return 'Entrance Hall';
    case 'grand_ballroom':
      return 'Grand Ballroom';
    case 'library_f1':
      return 'Decayed Library';
    case 'library_mezzanine':
      return 'Library Mezzanine';
    case 'kitchen':
      return 'Kitchen';
    case 'pantry':
      return 'Pantry';
    case 'boiler':
      return 'Boiler Utility';
    case 'west_cellar':
      return 'West Cellar';
    case 'security':
      return 'Security Storage';
    case 'east_study':
      return 'East Study';
    case 'stairs':
      return 'Stairwell';
    case 'upper_hall':
      return 'Upper Corridor';
    case 'endless_corridor':
      return 'Endless Hall';
    case 'cabin_1':
      return 'Cabin 1';
    case 'cabin_2':
      return 'Cabin 2';
    case 'cabin_3':
      return 'Cabin 3';
    case 'master_bedroom':
      return 'Master Bedroom';
  }
}

export const GameHud: React.FC<GameHudProps> = ({
  hud,
  muted,
  mobileInputRef,
  onToggleMute,
  onPause,
  onRestart,
  onInteract,
  onCrouch,
  onGlasses,
  onSelectSlot,
}) => {
  const dangerOpacity = Math.min(0.7, hud.dangerLevel * 0.45 + hud.damageFlash * 0.55);
  const postureLabel = hud.hiding
    ? 'Hidden'
    : hud.crouching
      ? 'Crouching'
      : 'Standing';
  const glassesReady = !hud.glassesActive && hud.glassesCooldownLeft <= 0;

  return (
    <div className="fixed inset-0 z-10 pointer-events-none select-none">
      {/* Subtle Peripheral Darkness Vignette */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 50% 50%, transparent 56%, rgba(3, 6, 4, 0.36) 100%)',
        }}
      />

      {/* Spectral Glasses Occult Night-Vision Overlay */}
      {hud.glassesActive && (
        <div
          data-testid="spectral-overlay"
          className="fixed inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at 50% 50%, rgba(28, 210, 232, 0.14) 24%, rgba(6, 56, 72, 0.48) 100%)',
            boxShadow: 'inset 0 0 80px rgba(56, 242, 255, 0.22)',
          }}
        />
      )}

      {/* Peripheral Threat & Damage Vignette */}
      {dangerOpacity > 0.02 && (
        <div
          className="fixed inset-0 pointer-events-none transition-opacity duration-150"
          style={{
            opacity: dangerOpacity,
            background:
              hud.damageFlash > 0.1
                ? 'radial-gradient(circle at 50% 50%, transparent 34%, rgba(165, 22, 22, 0.88) 100%)'
                : 'radial-gradient(circle at 50% 50%, transparent 46%, rgba(120, 18, 18, 0.68) 100%)',
          }}
        />
      )}

      {/* Restricted FOV Slats / Low Frame when Hiding */}
      {hud.hiding && (
        <div
          className="fixed inset-0 pointer-events-none flex flex-col justify-between"
          style={{
            background:
              hud.hidingKind === 'bed'
                ? 'linear-gradient(180deg, rgba(5,8,6,0.92) 0%, rgba(5,8,6,0.12) 32%, rgba(5,8,6,0.12) 72%, rgba(5,8,6,0.92) 100%)'
                : 'linear-gradient(90deg, rgba(5,8,6,0.95) 0%, rgba(5,8,6,0.18) 26%, rgba(5,8,6,0.18) 74%, rgba(5,8,6,0.95) 100%)',
          }}
        >
          <div className="h-14 bg-[#050806]/95 border-b border-[#223026]" />
          <div className="h-14 bg-[#050806]/95 border-t border-[#223026]" />
        </div>
      )}

      {/* Top Row: Left Vitals, Floor/Zone, Loop & Objective | Right Utility + Spectral Glasses */}
      <div className="flex items-start justify-between gap-2 sm:gap-3 p-2.5 sm:p-5">
        <div
          className="flex-1 min-w-0 max-w-[238px] sm:max-w-sm rounded-lg border border-[#2d3e33] px-3 py-2 sm:px-3.5 sm:py-2.5"
          style={{ backgroundColor: 'rgba(10, 17, 13, 0.86)' }}
        >
          <div className="flex items-center justify-between gap-2 sm:gap-3">
            <div
              className="flex items-center gap-1 sm:gap-1.5 shrink-0"
              aria-label={`Chances remaining: ${hud.strikesRemaining} of ${hud.maxStrikes}`}
            >
              {Array.from({ length: hud.maxStrikes }).map((_, idx) => (
                <VitalityPipSvg key={idx} active={idx < hud.strikesRemaining} className="w-4 h-4 sm:w-5 sm:h-5" />
              ))}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-[#9cb1a0] truncate">
              <span>{postureLabel}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-tabular text-[#d4e2d5]">{formatTimer(hud.elapsedSeconds)}</span>
            </div>
          </div>

          <div className="mt-1 flex items-center gap-1 text-[10px] sm:text-[11px] uppercase tracking-wide sm:tracking-wider text-[#84a18a] whitespace-nowrap">
            <span>F{hud.currentFloor}</span>
            <span aria-hidden="true">·</span>
            <span className="truncate">{formatZone(hud.currentZone)}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-tabular text-[#b8cbb9] shrink-0">Loop {hud.loopCount}</span>
          </div>

          <p className="mt-1 text-xs sm:text-sm font-medium text-[#dce8dd] leading-snug line-clamp-2">
            {hud.objectiveText}
          </p>

          {/* Stamina Bar */}
          <div className="mt-1.5 flex items-center gap-2">
            <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-[#829886]">Stamina</span>
            <div className="flex-1 h-1.5 rounded-sm bg-[#18221b] overflow-hidden">
              <div
                className="h-full transition-all duration-100"
                style={{
                  width: `${hud.stamina}%`,
                  backgroundColor: hud.stamina > 25 ? '#69b879' : '#c95c4e',
                }}
              />
            </div>
          </div>
        </div>

        {/* Top-Right Utility Controls + Desktop Spectral Glasses Toggle */}
        <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            tabIndex={-1}
            data-testid="glasses-button"
            aria-label="Toggle Spectral Glasses (G)"
            onClick={(e) => {
              e.currentTarget.blur();
              onGlasses();
            }}
            className={`hidden lg:flex min-h-[44px] px-3 rounded-lg border items-center gap-2 text-xs font-semibold transition-colors cursor-pointer ${
              hud.glassesActive
                ? 'border-[#5bf4ff] text-[#b4fbff]'
                : glassesReady
                  ? 'border-[#387580] hover:border-[#5ad8e8] text-[#9be7f0]'
                  : 'border-[#29383a] text-[#6d8386]'
            }`}
            style={{
              backgroundColor: hud.glassesActive
                ? 'rgba(18, 72, 84, 0.9)'
                : 'rgba(10, 19, 21, 0.86)',
            }}
          >
            <SpectralGlassesSvg active={hud.glassesActive} className="w-5 h-5 shrink-0" />
            <span className="font-mono-tabular">
              {hud.glassesActive
                ? `Vision ${hud.glassesTimeLeft.toFixed(1)}s`
                : hud.glassesCooldownLeft > 0
                  ? `${Math.ceil(hud.glassesCooldownLeft)}s`
                  : '[G] Glasses'}
            </span>
          </button>

          <button
            type="button"
            tabIndex={-1}
            aria-label={muted ? 'Unmute audio (M)' : 'Mute audio (M)'}
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleMute();
            }}
            className="min-h-[44px] min-w-[44px] rounded-lg border border-[#2d3e33] hover:border-[#53725d] flex items-center justify-center transition-colors cursor-pointer"
            style={{ backgroundColor: 'rgba(10, 17, 13, 0.86)' }}
          >
            <SoundIconSvg muted={muted} />
          </button>

          <button
            type="button"
            tabIndex={-1}
            aria-label="Restart run (R)"
            onClick={(e) => {
              e.currentTarget.blur();
              onRestart();
            }}
            className="min-h-[44px] min-w-[44px] rounded-lg border border-[#2d3e33] hover:border-[#53725d] flex items-center justify-center transition-colors cursor-pointer"
            style={{ backgroundColor: 'rgba(10, 17, 13, 0.86)' }}
          >
            <RestartIconSvg />
          </button>

          <button
            type="button"
            tabIndex={-1}
            aria-label="Pause game (P)"
            onClick={(e) => {
              e.currentTarget.blur();
              onPause();
            }}
            className="min-h-[44px] min-w-[44px] rounded-lg border border-[#2d3e33] hover:border-[#53725d] flex items-center justify-center transition-colors cursor-pointer"
            style={{ backgroundColor: 'rgba(10, 17, 13, 0.86)' }}
          >
            <PauseIconSvg />
          </button>
        </div>
      </div>

      {/* Transient Status Banner */}
      {hud.statusBanner && (
        <div
          className="fixed top-36 sm:top-24 left-1/2 -translate-x-1/2 z-20 px-4 py-1.5 rounded border border-[#44634d] text-xs sm:text-sm font-medium text-[#e3f0e4] whitespace-nowrap max-w-[92%] truncate"
          style={{ backgroundColor: 'rgba(12, 22, 16, 0.92)' }}
        >
          {hud.statusBanner}
        </div>
      )}

      {/* Triangle Loop Echo Note Overlay */}
      {hud.echoNoteText && (
        <div
          className="fixed top-48 sm:top-40 left-1/2 -translate-x-1/2 z-20 max-w-sm w-[90%] rounded-lg border border-[#7d734b] px-4 py-3 text-xs sm:text-sm text-[#ede5c9] shadow-xl"
          style={{ backgroundColor: 'rgba(18, 17, 12, 0.94)' }}
        >
          <p className="text-[10px] uppercase tracking-widest text-[#c4b178]">Recovered Note</p>
          <p className="mt-1 italic leading-relaxed">{hud.echoNoteText}</p>
        </div>
      )}

      {/* Center (0, 0) Crosshair + Tappable Interaction Prompt */}
      <div
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none"
        aria-live="polite"
      >
        <div
          className={`w-2 h-2 rounded-full border transition-colors ${
            hud.promptActionable
              ? 'border-[#8be39b] bg-[#8be39b]/60 scale-125'
              : 'border-[#c6d6c8]/75 bg-transparent'
          }`}
        />

        {hud.promptText && (
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onInteract();
            }}
            className={`mt-4 pointer-events-auto min-h-[40px] px-3.5 py-1.5 rounded border text-xs sm:text-sm font-medium whitespace-nowrap transition-colors cursor-pointer ${
              hud.promptActionable
                ? 'border-[#5f9e6b] text-[#e6f5e8]'
                : 'border-[#56403c] text-[#dcb5ae]'
            }`}
            style={{ backgroundColor: 'rgba(10, 17, 13, 0.88)' }}
          >
            <span className="font-mono-tabular text-[#8be39b] mr-2">[E]</span>
            {hud.promptText}
          </button>
        )}
      </div>

      {/* Mobile Touch Thumbstick & Action Buttons */}
      <MobileControls
        mobileInputRef={mobileInputRef}
        crouching={hud.crouching}
        hiding={hud.hiding}
        glassesActive={hud.glassesActive}
        glassesTimeLeft={hud.glassesTimeLeft}
        glassesCooldownLeft={hud.glassesCooldownLeft}
        promptText={hud.promptText}
        promptActionable={hud.promptActionable}
        onInteract={onInteract}
        onCrouch={onCrouch}
        onGlasses={onGlasses}
      />

      {/* Bottom-Center Compact 4-Slot Inventory Belt + Breaker Power Status */}
      <div className="fixed bottom-2.5 sm:bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 sm:gap-2 pointer-events-auto">
        {[0, 1, 2, 3].map((slotIdx) => {
          const itemId = hud.inventory[slotIdx];
          const meta = itemId ? ITEM_CATALOG[itemId] : null;
          const isSelected = Boolean(itemId) && hud.selectedSlot === slotIdx;

          return (
            <button
              key={slotIdx}
              type="button"
              tabIndex={-1}
              disabled={!meta}
              aria-label={meta ? `${meta.name}: ${meta.hint}` : `Empty slot ${slotIdx + 1}`}
              onClick={(e) => {
                e.currentTarget.blur();
                onSelectSlot(slotIdx);
              }}
              className={`min-h-[44px] h-11 px-2.5 sm:px-3 rounded-lg border flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                isSelected
                  ? 'border-[#6ec280] text-[#ebf5ec]'
                  : meta
                    ? 'border-[#384d3f] text-[#cbd8cd]'
                    : 'border-[#222f27] text-[#55665a]'
              }`}
              style={{
                backgroundColor: isSelected ? 'rgba(22, 39, 28, 0.92)' : 'rgba(10, 17, 13, 0.86)',
              }}
            >
              <span className="font-mono-tabular text-[11px] opacity-65">{slotIdx + 1}</span>
              {meta ? (
                <>
                  <ItemSvgIcon id={meta.id} className="w-5 h-5 shrink-0" />
                  <span className="hidden sm:inline text-xs font-medium">{meta.shortLabel}</span>
                </>
              ) : (
                <span className="hidden sm:inline text-[11px]">Empty</span>
              )}
            </button>
          );
        })}

        <div
          className="h-11 px-2.5 sm:px-3 rounded-lg border flex items-center text-xs font-medium whitespace-nowrap shrink-0"
          style={{
            borderColor: hud.powerRestored ? '#4a8f58' : '#4a3533',
            backgroundColor: 'rgba(10, 17, 13, 0.86)',
            color: hud.powerRestored ? '#8be39b' : '#c9887e',
          }}
        >
          {hud.powerRestored ? 'Power On' : 'No Power'}
        </div>
      </div>
    </div>
  );
};
