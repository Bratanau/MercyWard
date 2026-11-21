import { useCallback, useMemo, useRef, useState } from 'react';
import { GameHud } from './components/GameHud';
import { GameOverModal, PauseModal } from './components/GameModals';
import {
  HospitalController,
  HospitalViewport,
  MobileControlState,
} from './components/HospitalViewport';
import { SettingsModal } from './components/SettingsModal';
import { TitleScreen } from './components/TitleScreen';
import { buildHudSnapshot, createInitialSimulation } from './game/rules';
import { GameSettings, loadSettings, saveSettings } from './game/settings';
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
  const [settings, setSettings] = useState<GameSettings>(() => loadSettings());
  const [settingsOpen, setSettingsOpen] = useState(false);

  const controllerRef = useRef<HospitalController | null>(null);
  const mobileInputRef = useRef<MobileControlState>({
    moveX: 0,
    moveY: 0,
    sprint: false,
  });

  const handleSettingsChange = useCallback((next: GameSettings) => {
    const clean = saveSettings(next);
    setSettings(clean);
  }, []);

  const handleStart = useCallback(() => {
    setSettingsOpen(false);
    controllerRef.current?.startNewRun(false, true);
  }, []);

  const handleNextLoopOrReset = useCallback(() => {
    setSettingsOpen(false);
    controllerRef.current?.startNewRun(false, true);
  }, []);

  const handleResetTimeline = useCallback(() => {
    setSettingsOpen(false);
    controllerRef.current?.startNewRun(false, true);
  }, []);

  const handleResume = useCallback(() => {
    setSettingsOpen(false);
    controllerRef.current?.setPhase('playing');
  }, []);

  const handlePause = useCallback(() => {
    controllerRef.current?.setPhase('paused');
  }, []);

  const handleTitle = useCallback(() => {
    setSettingsOpen(false);
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

  const handleThrow = useCallback(() => {
    controllerRef.current?.triggerThrow();
  }, []);

  const handleFlashlight = useCallback(() => {
    controllerRef.current?.triggerFlashlight();
  }, []);

  const handleDismissLore = useCallback(() => {
    controllerRef.current?.dismissLore();
  }, []);

  const handleSelectSlot = useCallback((idx: number) => {
    controllerRef.current?.selectSlot(idx);
  }, []);

  return (
    <main className="relative w-full h-full overflow-hidden bg-[#040705]">
      <HospitalViewport
        autostart={autostart}
        settings={settings}
        mobileInputRef={mobileInputRef}
        controllerRef={controllerRef}
        onHudUpdate={setHud}
        onMuteChange={setMuted}
      />

      {hud.phase === 'title' && !settingsOpen && (
        <TitleScreen
          onStart={handleStart}
          onOpenSettings={() => setSettingsOpen(true)}
        />
      )}

      {hud.phase === 'playing' && (
        <GameHud
          hud={hud}
          muted={muted}
          mobileInputRef={mobileInputRef}
          onToggleMute={handleToggleMute}
          onPause={handlePause}
          onInteract={handleInteract}
          onCrouch={handleCrouch}
          onGlasses={handleGlasses}
          onThrow={handleThrow}
          onFlashlight={handleFlashlight}
          onDismissLore={handleDismissLore}
          onSelectSlot={handleSelectSlot}
        />
      )}

      {/* 1-Hit Lethal Devour Jumpscare Crimson Vignette */}
      {hud.phase === 'jumpscare' && (
        <div
          className="fixed inset-0 z-20 pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at 50% 46%, rgba(165, 10, 10, 0.16) 22%, rgba(120, 4, 4, 0.85) 100%)',
          }}
        />
      )}

      {/* Seamless 1.5s Triangle Rebirth Blackout */}
      {hud.phase === 'rebirth' && (
        <div
          data-testid="rebirth-blackout"
          className="fixed inset-0 z-30 flex flex-col items-center justify-center bg-[#020303] text-center px-6 pointer-events-none"
        >
          <p className="text-xs uppercase tracking-[0.28em] text-[#8f9c92]">
            Cycle #{hud.loopCount + 1} Begins
          </p>
          <p className="mt-2 font-display text-2xl sm:text-3xl text-[#e2ebe3]">
            You wake up gasping...
          </p>
          <p className="mt-2 text-xs sm:text-sm text-[#768779]">
            Everything you carried remains in your hands.
          </p>
        </div>
      )}

      {hud.phase === 'paused' && !settingsOpen && (
        <PauseModal
          loopCount={hud.loopCount}
          onResume={handleResume}
          onOpenSettings={() => setSettingsOpen(true)}
          onRestart={handleStart}
          onTitle={handleTitle}
        />
      )}

      {settingsOpen && (
        <SettingsModal
          settings={settings}
          onChange={handleSettingsChange}
          onClose={() => setSettingsOpen(false)}
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
