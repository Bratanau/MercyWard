import React from 'react';
import { GameHudSnapshot } from '../game/types';

interface PauseModalProps {
  loopCount: number;
  onResume: () => void;
  onOpenSettings: () => void;
  onRestart: () => void;
  onTitle: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  loopCount,
  onResume,
  onOpenSettings,
  onRestart,
  onTitle,
}) => {
  return (
    <div
      data-testid="pause-modal"
      className="fixed inset-0 z-30 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(5, 9, 7, 0.8)' }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pause-title"
        className="w-full max-w-sm rounded-xl border border-[#324638] p-6 shadow-2xl"
        style={{ backgroundColor: '#0e1712' }}
      >
        <p className="text-xs uppercase tracking-[0.2em] text-[#7ea085]">
          Estate Status · Loop {loopCount}
        </p>
        <h2 id="pause-title" className="mt-1 font-display text-3xl font-bold text-[#e3ede3]">
          Paused
        </h2>
        <p className="mt-2 text-sm text-[#a6b8a9]">
          Press Escape or Resume to return to the dark.
        </p>

        <div className="mt-6 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onResume}
            className="min-h-[46px] w-full rounded-lg bg-[#69b879] hover:bg-[#7ccc8c] text-[#08120a] font-semibold text-sm transition-colors cursor-pointer"
          >
            Resume
          </button>
          <button
            type="button"
            data-testid="pause-settings-button"
            onClick={onOpenSettings}
            className="min-h-[44px] w-full rounded-lg border border-[#344a3b] hover:border-[#69b879] bg-[#142119] text-[#dbe6dc] font-medium text-sm transition-colors cursor-pointer"
          >
            Settings
          </button>
          <button
            type="button"
            data-testid="pause-restart-button"
            onClick={onRestart}
            className="min-h-[44px] w-full rounded-lg border border-[#4a3533] hover:border-[#a3534c] bg-[#1c1414] text-[#e6c8c5] font-medium text-sm transition-colors cursor-pointer"
          >
            Restart New Run
          </button>
          <button
            type="button"
            onClick={onTitle}
            className="min-h-[44px] w-full rounded-lg border border-[#2a3b30] hover:border-[#445f4d] bg-transparent text-[#9bb09f] font-medium text-sm transition-colors cursor-pointer"
          >
            Return to Title
          </button>
        </div>
      </div>
    </div>
  );
};

interface GameOverModalProps {
  hud: GameHudSnapshot;
  onRestart: () => void;
  onResetTimeline: () => void;
  onTitle: () => void;
}

function formatTime(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  hud,
  onRestart,
  onResetTimeline,
  onTitle,
}) => {
  const won = hud.victory;

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(5, 9, 7, 0.86)' }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="gameover-title"
        className="w-full max-w-md rounded-xl border p-6 sm:p-7 shadow-2xl"
        style={{
          backgroundColor: '#0e1712',
          borderColor: won ? '#4a8556' : '#6b3834',
        }}
      >
        <p
          className="text-xs uppercase tracking-[0.2em] font-medium"
          style={{ color: won ? '#84d996' : '#d1786f' }}
        >
          {won ? `Loop ${hud.loopCount} Broken` : `Loop ${hud.loopCount} Terminated`}
        </p>
        <h2
          id="gameover-title"
          className="mt-1 font-display text-4xl font-bold text-[#e6efe6]"
        >
          {won ? 'Escaped the Estate' : 'Consumed by The Resident'}
        </h2>
        <p className="mt-2 text-sm text-[#a8baa9] leading-relaxed">
          {won
            ? `You shut off the boiler steam, restored emergency power, severed the exit chains in ${hud.loopCount} ${hud.loopCount === 1 ? 'cycle' : 'cycles'}, and uncovered ${hud.loreFound}/${hud.loreTotal} memory fragments.`
            : 'Your body remains where you fell. Re-enter the next cycle.'}
        </p>

        {/* Tabular Stats Strip */}
        <div className="mt-5 grid grid-cols-3 gap-2.5">
          <div className="rounded-lg border border-[#28392e] bg-[#131f18] p-3">
            <div className="text-[11px] uppercase tracking-wider text-[#7f9684]">Time</div>
            <div className="mt-1 font-mono-tabular text-lg font-semibold text-[#e2ece3]">
              {formatTime(hud.elapsedSeconds)}
            </div>
          </div>
          <div className="rounded-lg border border-[#28392e] bg-[#131f18] p-3">
            <div className="text-[11px] uppercase tracking-wider text-[#7f9684]">Lore</div>
            <div className="mt-1 font-mono-tabular text-lg font-semibold text-[#e2ece3]">
              {hud.loreFound} / {hud.loreTotal}
            </div>
          </div>
          <div className="rounded-lg border border-[#28392e] bg-[#131f18] p-3">
            <div className="text-[11px] uppercase tracking-wider text-[#7f9684]">Loops</div>
            <div className="mt-1 font-mono-tabular text-lg font-semibold text-[#e2ece3]">
              #{hud.loopCount}
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row gap-2.5">
          <button
            type="button"
            data-start="true"
            onClick={onRestart}
            className="min-h-[48px] flex-1 rounded-lg bg-[#69b879] hover:bg-[#7ccc8c] text-[#08120a] font-semibold text-sm transition-colors cursor-pointer"
          >
            New Timeline
          </button>
          {!won && hud.loopCount > 1 && (
            <button
              type="button"
              onClick={onResetTimeline}
              className="min-h-[48px] px-4 rounded-lg border border-[#314537] hover:border-[#4d6e57] bg-[#131f18] text-[#c7d6c9] font-medium text-sm transition-colors cursor-pointer"
            >
              Reset Loop 1
            </button>
          )}
          <button
            type="button"
            onClick={onTitle}
            className="min-h-[48px] sm:w-32 rounded-lg border border-[#314537] hover:border-[#4d6e57] bg-[#131f18] text-[#c7d6c9] font-medium text-sm transition-colors cursor-pointer"
          >
            Title
          </button>
        </div>
      </div>
    </div>
  );
};
