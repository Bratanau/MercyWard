import { useCallback, useMemo, useRef, useState } from 'react';
import { GameHud } from './components/GameHud';
import { GameOverModal, PauseModal } from './components/GameModals';
import {
  HospitalController,
  HospitalViewport,
  MobileControlState,
} from './components/HospitalViewport';
import { TitleScreen } from './components/TitleScreen';
import { buildHudSnapshot, createInitialSimulation } from './game/rules';
import { GameHudSnapshot } from './game/types';

export default function App() {
  const autostart = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('autostart') === '1';
  }, []);

  const [hud, setHud] = useState<GameHudSnapshot>(() =>
    buildHudSnapshot(createInitialSimulation(autostart))
  );
  const [muted, setMuted] = useState(false);

  const controllerRef = useRef<HospitalController | null>(null);
  const mobileInputRef = useRef<MobileControlState>({
    moveX: 0,
    moveY: 0,
    sprint: false,
  });

  const handleStart = useCallback(() => {
    controllerRef.current?.startNewRun(false, false);
  }, []);

  const handleNextLoopOrReset = useCallback(() => {
    if (hud.phase === 'gameover' && !hud.victory) {
      controllerRef.current?.startNewRun(true, false);
    } else {
      controllerRef.current?.startNewRun(false, true);
    }
  }, [hud.phase, hud.victory]);

  const handleResetTimeline = useCallback(() => {
    controllerRef.current?.startNewRun(false, true);
  }, []);

  const handleResume = useCallback(() => {
    controllerRef.current?.setPhase('playing');
  }, []);

  const handlePause = useCallback(() => {
    controllerRef.current?.setPhase('paused');
  }, []);

  const handleTitle = useCallback(() => {
    controllerRef.current?.setPhase('title');
  }, []);

  const handleToggleMute = useCallback(() => {
    controllerRef.current?.toggleMute();
  }, []);

  const handleInteract = useCallback(() => {
    controllerRef.current?.triggerInteract();
  }, []);

  const handleCrouch = useCallback(() => {
    controllerRef.current?.triggerCrouch();
  }, []);

  const handleGlasses = useCallback(() => {
    controllerRef.current?.triggerGlasses();
  }, []);

  const handleSelectSlot = useCallback((idx: number) => {
    controllerRef.current?.selectSlot(idx);
  }, []);

  return (
    <main className="relative w-full h-full overflow-hidden bg-[#040705]">
      <HospitalViewport
        autostart={autostart}
        mobileInputRef={mobileInputRef}
        controllerRef={controllerRef}
        onHudUpdate={setHud}
        onMuteChange={setMuted}
      />

      {hud.phase === 'title' && <TitleScreen onStart={handleStart} />}

      {hud.phase === 'playing' && (
        <GameHud
          hud={hud}
          muted={muted}
          mobileInputRef={mobileInputRef}
          onToggleMute={handleToggleMute}
          onPause={handlePause}
          onRestart={handleStart}
          onInteract={handleInteract}
          onCrouch={handleCrouch}
          onGlasses={handleGlasses}
          onSelectSlot={handleSelectSlot}
        />
      )}

      {hud.phase === 'jumpscare' && (
        <div
          className="fixed inset-0 z-20 pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at 50% 46%, rgba(160, 12, 12, 0.14) 24%, rgba(120, 8, 8, 0.72) 100%)',
          }}
        />
      )}

      {hud.phase === 'paused' && (
        <PauseModal
          loopCount={hud.loopCount}
          onResume={handleResume}
          onRestart={handleStart}
          onTitle={handleTitle}
        />
      )}

      {hud.phase === 'gameover' && (
        <GameOverModal
          hud={hud}
          onRestart={handleNextLoopOrReset}
          onResetTimeline={handleResetTimeline}
          onTitle={handleTitle}
        />
      )}
    </main>
  );
}
