import React, { useRef, useState } from 'react';
import { BottleIconSvg, FlashlightIconSvg, SpectralGlassesSvg } from './GameIcons';
import { MobileControlState } from './HospitalViewport';

interface MobileControlsProps {
  mobileInputRef: React.MutableRefObject<MobileControlState>;
  crouching: boolean;
  hiding: boolean;
  glassesActive: boolean;
  glassesTimeLeft: number;
  glassesCooldownLeft: number;
  bottlesCount: number;
  flashlightOn: boolean;
  battery: number;
  promptText: string | null;
  promptActionable: boolean;
  onInteract: () => void;
  onCrouch: () => void;
  onGlasses: () => void;
  onThrow: () => void;
  onFlashlight: () => void;
}

export const MobileControls: React.FC<MobileControlsProps> = ({
  mobileInputRef,
  crouching,
  hiding,
  glassesActive,
  glassesTimeLeft,
  glassesCooldownLeft,
  bottlesCount,
  flashlightOn,
  battery,
  promptText,
  promptActionable,
  onInteract,
  onCrouch,
  onGlasses,
  onThrow,
  onFlashlight,
}) => {
  const padRef = useRef<HTMLDivElement | null>(null);
  const knobRef = useRef<HTMLDivElement | null>(null);
  const activeTouchId = useRef<number | null>(null);
  const [sprintingUI, setSprintingUI] = useState(false);

  const maxRadius = 36;

  const updateStick = (clientX: number, clientY: number) => {
    const pad = padRef.current;
    const knob = knobRef.current;
    if (!pad || !knob) return;
    const rect = pad.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > maxRadius) {
      dx = (dx / dist) * maxRadius;
      dy = (dy / dist) * maxRadius;
    }
    knob.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
    mobileInputRef.current.moveX = dx / maxRadius;
    mobileInputRef.current.moveY = -dy / maxRadius;
  };

  const resetStick = () => {
    activeTouchId.current = null;
    if (knobRef.current) {
      knobRef.current.style.transform = 'translate3d(0px, 0px, 0)';
    }
    mobileInputRef.current.moveX = 0;
    mobileInputRef.current.moveY = 0;
  };

  const glassesReady = !glassesActive && glassesCooldownLeft <= 0;

  return (
    <div className="lg:hidden fixed inset-x-0 bottom-16 z-20 flex items-end justify-between px-3 sm:px-4 pointer-events-none">
      {/* Bottom-left Virtual Movement Joystick */}
      <div
        ref={padRef}
        aria-label="Movement joystick"
        onTouchStart={(e) => {
          e.stopPropagation();
          if (activeTouchId.current === null && e.changedTouches.length > 0) {
            const t = e.changedTouches[0];
            activeTouchId.current = t.identifier;
            updateStick(t.clientX, t.clientY);
          }
        }}
        onTouchMove={(e) => {
          e.stopPropagation();
          for (let i = 0; i < e.changedTouches.length; i++) {
            const t = e.changedTouches[i];
            if (t.identifier === activeTouchId.current) {
              updateStick(t.clientX, t.clientY);
            }
          }
        }}
        onTouchEnd={(e) => {
          e.stopPropagation();
          for (let i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === activeTouchId.current) {
              resetStick();
            }
          }
        }}
        onTouchCancel={(e) => {
          e.stopPropagation();
          resetStick();
        }}
        className="pointer-events-auto relative w-24 h-24 sm:w-28 sm:h-28 rounded-full border border-[#4a6251] flex items-center justify-center touch-none shrink-0"
        style={{ backgroundColor: 'rgba(11, 18, 13, 0.62)' }}
      >
        <div
          ref={knobRef}
          className="w-10 h-10 sm:w-11 sm:h-11 rounded-full border border-[#88ba95] shadow-md"
          style={{ backgroundColor: 'rgba(84, 136, 97, 0.78)' }}
        />
      </div>

      {/* Bottom-right Thumb Action Cluster */}
      <div className="pointer-events-auto flex flex-col items-end gap-1.5">
        {/* Top sub-row: Throw, Flashlight, Glasses */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            tabIndex={-1}
            disabled={bottlesCount <= 0 || hiding}
            data-testid="mobile-throw-button"
            aria-label={`Throw bottle (${bottlesCount} left)`}
            onClick={(e) => {
              e.currentTarget.blur();
              onThrow();
            }}
            className={`min-h-[40px] px-2.5 rounded-lg border flex items-center gap-1 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
              bottlesCount > 0 && !hiding
                ? 'border-[#4f7d5d] text-[#d5f0dc]'
                : 'border-[#253028] text-[#5c6b60]'
            }`}
            style={{ backgroundColor: 'rgba(12, 20, 15, 0.82)' }}
          >
            <BottleIconSvg className="w-3.5 h-3.5 shrink-0" />
            <span className="font-mono-tabular">{bottlesCount}</span>
          </button>

          <button
            type="button"
            tabIndex={-1}
            aria-label={flashlightOn ? 'Turn flashlight off' : 'Turn flashlight on'}
            onClick={(e) => {
              e.currentTarget.blur();
              onFlashlight();
            }}
            className={`min-h-[40px] px-2.5 rounded-lg border flex items-center gap-1 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
              flashlightOn
                ? 'border-[#8f8048] text-[#f2e7b5]'
                : 'border-[#333f37] text-[#8d9d91]'
            }`}
            style={{ backgroundColor: 'rgba(12, 20, 15, 0.82)' }}
          >
            <FlashlightIconSvg on={flashlightOn} className="w-3.5 h-3.5 shrink-0" />
            <span className="font-mono-tabular">{battery}%</span>
          </button>

          <button
            type="button"
            tabIndex={-1}
            aria-label="Toggle Spectral Glasses"
            onClick={(e) => {
              e.currentTarget.blur();
              onGlasses();
            }}
            className={`min-h-[40px] px-2.5 rounded-lg border flex items-center gap-1 text-xs font-semibold tracking-wide whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
              glassesActive
                ? 'bg-[#195e6b] text-[#aef9ff] border-[#52e8f7]'
                : glassesReady
                  ? 'text-[#aef5fc] border-[#397a85]'
                  : 'text-[#6c8285] border-[#29383a]'
            }`}
            style={
              glassesActive
                ? undefined
                : { backgroundColor: 'rgba(10, 20, 22, 0.82)' }
            }
          >
            <SpectralGlassesSvg active={glassesActive} className="w-4 h-4 shrink-0" />
            <span className="font-mono-tabular">
              {glassesActive
                ? `${glassesTimeLeft.toFixed(1)}s`
                : glassesCooldownLeft > 0
                  ? `${Math.ceil(glassesCooldownLeft)}s`
                  : 'Vision'}
            </span>
          </button>
        </div>

        {/* Bottom sub-row: Crouch, Sprint, Interact */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            tabIndex={-1}
            aria-label={crouching ? 'Stand up' : 'Crouch'}
            onClick={(e) => {
              e.currentTarget.blur();
              onCrouch();
            }}
            className={`min-h-[46px] px-2.5 rounded-lg border text-xs font-semibold tracking-wide whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
              crouching
                ? 'bg-[#69b879] text-[#08120a] border-[#8ee09e]'
                : 'text-[#d3e0d5] border-[#3d5243]'
            }`}
            style={crouching ? undefined : { backgroundColor: 'rgba(12, 20, 15, 0.78)' }}
          >
            {crouching ? 'Stand' : 'Crouch'}
          </button>

          <button
            type="button"
            tabIndex={-1}
            aria-label="Sprint"
            onTouchStart={(e) => {
              e.stopPropagation();
              mobileInputRef.current.sprint = true;
              setSprintingUI(true);
            }}
            onTouchEnd={(e) => {
              e.stopPropagation();
              mobileInputRef.current.sprint = false;
              setSprintingUI(false);
            }}
            onTouchCancel={(e) => {
              e.stopPropagation();
              mobileInputRef.current.sprint = false;
              setSprintingUI(false);
            }}
            className={`min-h-[46px] px-2.5 rounded-lg border text-xs font-semibold tracking-wide whitespace-nowrap shrink-0 transition-colors ${
              sprintingUI
                ? 'bg-[#d4a64a] text-[#111008] border-[#f0c771]'
                : 'text-[#d3e0d5] border-[#3d5243]'
            }`}
            style={sprintingUI ? undefined : { backgroundColor: 'rgba(12, 20, 15, 0.78)' }}
          >
            Sprint
          </button>

          <button
            type="button"
            tabIndex={-1}
            aria-label={hiding ? promptText || 'Exit hiding' : promptText || 'Interact'}
            onClick={(e) => {
              e.currentTarget.blur();
              onInteract();
            }}
            className={`min-h-[46px] min-w-[92px] px-3 rounded-lg border text-xs sm:text-sm font-semibold tracking-wide whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
              hiding || (promptText !== null && promptActionable)
                ? 'bg-[#69b879] text-[#08120a] border-[#93e6a3]'
                : 'text-[#d3e0d5] border-[#3d5243]'
            }`}
            style={
              hiding || (promptText !== null && promptActionable)
                ? undefined
                : { backgroundColor: 'rgba(12, 20, 15, 0.82)' }
            }
          >
            {hiding
              ? 'Exit'
              : promptText?.startsWith('Hide:')
                ? 'Hide'
                : 'Interact'}
          </button>
        </div>
      </div>
    </div>
  );
};
