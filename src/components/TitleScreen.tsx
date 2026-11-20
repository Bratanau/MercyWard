import React from 'react';
import { WardCrestSvg } from './GameIcons';

interface TitleScreenProps {
  onStart: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({ onStart }) => {
  return (
    <div className="fixed inset-0 z-20 flex flex-col justify-between pointer-events-none p-5 sm:p-10">
      {/* Subtle dark vignette framing the live Grand Foyer 3D corridor */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 56% 42%, rgba(6,10,8,0.04) 0%, rgba(4,7,5,0.56) 86%)',
        }}
      />

      {/* Top Left Minimal Institutional Stamp */}
      <div className="relative z-10 flex items-center gap-3">
        <WardCrestSvg className="w-11 h-11 sm:w-12 sm:h-12 shrink-0" />
        <div>
          <p className="text-xs tracking-[0.22em] text-[#84a68c] uppercase font-medium">
            St. Jude Estate
          </p>
          <p className="text-sm text-[#c4d3c6] font-medium">
            Grand Ballroom · 2-Story Library · Shifting Wings
          </p>
        </div>
      </div>

      {/* Lower Negative-Space Title Lockup + Primary CTA */}
      <div className="relative z-10 max-w-xl pointer-events-auto">
        <h1
          className="font-display text-5xl sm:text-7xl font-bold tracking-tight text-[#e3ede3] leading-[0.95]"
          style={{ textShadow: '0 4px 24px rgba(0,0,0,0.85)', textWrap: 'balance' }}
        >
          Mercy Ward 7
        </h1>
        <p className="mt-3 text-sm sm:text-base text-[#b7c8b9] max-w-md leading-relaxed">
          Explore the cavernous Ballroom, 2-story Library, and twisting wings while avoiding The
          Resident. Use Spectral Glasses to spot her through walls, watch for shifting halls behind
          your back, restore Boiler power, and sever the exit chains.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-4">
          <button
            type="button"
            data-start="true"
            onClick={onStart}
            className="min-h-[48px] px-8 py-3 rounded-lg bg-[#69b879] hover:bg-[#7ccc8c] active:scale-[0.98] text-[#08120a] font-semibold text-base tracking-wide transition-colors cursor-pointer shadow-lg"
          >
            Enter Estate
          </button>
        </div>

        <p className="mt-6 text-xs sm:text-sm text-[#899e8d] tracking-wide">
          WASD / Joystick Move · Mouse / Swipe Look · E Interact · G Glasses · C Crouch · Shift Sprint
        </p>
      </div>
    </div>
  );
};
