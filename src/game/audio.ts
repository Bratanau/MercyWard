export class HorrorAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private droneOscA: OscillatorNode | null = null;
  private droneOscB: OscillatorNode | null = null;
  private droneGain: GainNode | null = null;
  private tensionOscA: OscillatorNode | null = null;
  private tensionOscB: OscillatorNode | null = null;
  private tensionGain: GainNode | null = null;
  private spectralOsc: OscillatorNode | null = null;
  private spectralGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  private muted = false;
  private glassesAudioActive = false;
  private glassesWhisperTimer = 0;
  private heartbeatTimer = 0;
  private chasePulseTimer = 0;
  private groanTimer = 7;

  public unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
      return;
    }

    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    try {
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : 0.52;
      this.masterGain.connect(this.ctx.destination);

      // Reusable 1.5s white noise buffer for steam, breath, whispers, and crashes
      const sampleRate = this.ctx.sampleRate;
      const len = Math.floor(sampleRate * 1.5);
      this.noiseBuffer = this.ctx.createBuffer(1, len, sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < len; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      // Base State: Deep sub-bass drones (42Hz + 58Hz)
      const droneFilter = this.ctx.createBiquadFilter();
      droneFilter.type = 'lowpass';
      droneFilter.frequency.value = 140;

      this.droneGain = this.ctx.createGain();
      this.droneGain.gain.value = 0.04;

      this.droneOscA = this.ctx.createOscillator();
      this.droneOscA.type = 'sine';
      this.droneOscA.frequency.value = 42;

      this.droneOscB = this.ctx.createOscillator();
      this.droneOscB.type = 'triangle';
      this.droneOscB.frequency.value = 58;

      this.droneOscA.connect(droneFilter);
      this.droneOscB.connect(droneFilter);
      droneFilter.connect(this.droneGain);
      this.droneGain.connect(this.masterGain);
      this.droneOscA.start();
      this.droneOscB.start();

      // Stalker Proximity Layer: Dissonant rising string screech texture
      const tensionFilter = this.ctx.createBiquadFilter();
      tensionFilter.type = 'bandpass';
      tensionFilter.frequency.value = 920;
      tensionFilter.Q.value = 3.2;

      this.tensionGain = this.ctx.createGain();
      this.tensionGain.gain.value = 0.0001;

      this.tensionOscA = this.ctx.createOscillator();
      this.tensionOscA.type = 'sawtooth';
      this.tensionOscA.frequency.value = 415;

      this.tensionOscB = this.ctx.createOscillator();
      this.tensionOscB.type = 'sawtooth';
      this.tensionOscB.frequency.value = 441; // sharp minor-second dissonance

      this.tensionOscA.connect(tensionFilter);
      this.tensionOscB.connect(tensionFilter);
      tensionFilter.connect(this.tensionGain);
      this.tensionGain.connect(this.masterGain);
      this.tensionOscA.start();
      this.tensionOscB.start();

      // Spectral Glasses Layer: Low eerie occult hum (~112Hz)
      const spectralFilter = this.ctx.createBiquadFilter();
      spectralFilter.type = 'bandpass';
      spectralFilter.frequency.value = 260;
      spectralFilter.Q.value = 4.0;

      this.spectralGain = this.ctx.createGain();
      this.spectralGain.gain.value = 0.0001;

      this.spectralOsc = this.ctx.createOscillator();
      this.spectralOsc.type = 'sine';
      this.spectralOsc.frequency.value = 112;
      this.spectralOsc.connect(spectralFilter);
      spectralFilter.connect(this.spectralGain);
      this.spectralGain.connect(this.masterGain);
      this.spectralOsc.start();
    } catch {
      this.ctx = null;
    }
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.52, this.ctx.currentTime, 0.04);
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setAmbienceActive(active: boolean): void {
    if (!this.ctx || !this.droneGain || !this.tensionGain) return;
    const now = this.ctx.currentTime;
    this.droneGain.gain.setTargetAtTime(active ? 0.085 : 0.015, now, 0.2);
    if (!active) {
      this.tensionGain.gain.setTargetAtTime(0.0001, now, 0.12);
      this.setSpectralGlassesActive(false);
    }
  }

  public setSpectralGlassesActive(active: boolean): void {
    this.glassesAudioActive = active;
    if (!this.ctx || !this.spectralGain) return;
    const now = this.ctx.currentTime;
    this.spectralGain.gain.setTargetAtTime(active && !this.muted ? 0.11 : 0.0001, now, 0.12);
  }

  public computeSpatial(
    playerX: number,
    playerZ: number,
    playerYaw: number,
    sourceX: number,
    sourceZ: number,
    maxRange = 22
  ): { pan: number; atten: number } {
    const dx = sourceX - playerX;
    const dz = sourceZ - playerZ;
    const dist = Math.hypot(dx, dz);
    if (dist >= maxRange) return { pan: 0, atten: 0 };

    const rightX = Math.cos(playerYaw);
    const rightZ = -Math.sin(playerYaw);
    const normDist = Math.max(0.01, dist);
    const pan = Math.max(-0.95, Math.min(0.95, (dx * rightX + dz * rightZ) / normDist));
    const atten = Math.pow(1 - dist / maxRange, 1.5);
    return { pan, atten };
  }

  public updateAdaptiveScore(dt: number, dangerLevel: number, isChasing: boolean): void {
    if (!this.ctx || !this.masterGain || this.muted) {
      this.heartbeatTimer = 0;
      this.chasePulseTimer = 0;
      return;
    }

    const now = this.ctx.currentTime;

    // 1. Rising dissonant string texture scaled by proximity
    if (this.tensionGain && this.tensionOscA && this.tensionOscB) {
      const targetGain = dangerLevel > 0.25 ? (dangerLevel - 0.25) * 0.08 : 0.0001;
      this.tensionGain.gain.setTargetAtTime(targetGain, now, 0.14);
      const pitchShift = 1 + dangerLevel * 0.18;
      this.tensionOscA.frequency.setTargetAtTime(415 * pitchShift, now, 0.18);
      this.tensionOscB.frequency.setTargetAtTime(441 * pitchShift, now, 0.18);
    }

    // 2. Distant metallic building groans
    this.groanTimer -= dt;
    if (this.groanTimer <= 0) {
      this.groanTimer = 9 + Math.random() * 8;
      this.playBuildingGroan();
    }

    // 3. Binaural Heartbeat (70 -> 140 BPM as danger climbs)
    if (dangerLevel >= 0.18) {
      const bpm = 70 + dangerLevel * 70;
      const beatInterval = 60 / bpm;
      this.heartbeatTimer -= dt;
      if (this.heartbeatTimer <= 0) {
        this.heartbeatTimer = beatInterval;
        this.playHeartbeatPulse(0.07 + dangerLevel * 0.24);
      }
    } else {
      this.heartbeatTimer = 0;
    }

    // 4. Chase State: Industrial thud + frantic breathing
    if (isChasing) {
      this.chasePulseTimer -= dt;
      if (this.chasePulseTimer <= 0) {
        this.chasePulseTimer = 0.42;
        this.playChaseIndustrialHit();
      }
    } else {
      this.chasePulseTimer = 0;
    }

    // 5. Spectral Glasses active whispers
    if (this.glassesAudioActive) {
      this.glassesWhisperTimer -= dt;
      if (this.glassesWhisperTimer <= 0) {
        this.glassesWhisperTimer = 1.15;
        this.playSpatialWhisper((Math.random() - 0.5) * 1.4, 0.42);
      }
    } else {
      this.glassesWhisperTimer = 0;
    }
  }

  private playBuildingGroan(): void {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(72, now);
    osc.frequency.exponentialRampToValueAtTime(48, now + 1.8);
    filter.type = 'bandpass';
    filter.frequency.value = 180;
    filter.Q.value = 6;
    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(0.035, now + 0.5);
    g.gain.exponentialRampToValueAtTime(0.001, now + 1.9);
    osc.connect(filter);
    filter.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 2.0);
  }

  private playHeartbeatPulse(gainPeak: number): void {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const thump = (offset: number, freq: number, amp: number, pan: number) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      const panner = this.ctx.createStereoPanner();
      panner.pan.value = pan;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + offset);
      osc.frequency.exponentialRampToValueAtTime(26, now + offset + 0.14);
      g.gain.setValueAtTime(0.001, now + offset);
      g.gain.linearRampToValueAtTime(amp, now + offset + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.16);
      osc.connect(g);
      g.connect(panner);
      panner.connect(this.masterGain);
      osc.start(now + offset);
      osc.stop(now + offset + 0.18);
    };
    thump(0, 68, gainPeak, -0.18);
    thump(0.14, 54, gainPeak * 0.68, 0.18);
  }

  private playChaseIndustrialHit(): void {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(115, now);
    osc.frequency.exponentialRampToValueAtTime(34, now + 0.16);
    g.gain.setValueAtTime(0.14, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.2);

    // Subtle frantic breath burst
    if (this.noiseBuffer) {
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 680;
      filter.Q.value = 2.2;
      const ng = this.ctx.createGain();
      ng.gain.setValueAtTime(0.001, now);
      ng.gain.linearRampToValueAtTime(0.045, now + 0.08);
      ng.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
      src.connect(filter);
      filter.connect(ng);
      ng.connect(this.masterGain);
      src.start(now);
      src.stop(now + 0.25);
    }
  }

  public playPlayerFootstep(crouching: boolean, sprinting: boolean): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    const jitter = 0.9 + Math.random() * 0.2;
    osc.type = 'sine';
    osc.frequency.setValueAtTime((sprinting ? 170 : 138) * jitter, now);
    osc.frequency.exponentialRampToValueAtTime(48, now + 0.085);
    const vol = crouching ? 0.025 : sprinting ? 0.12 : 0.075;
    g.gain.setValueAtTime(vol, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.095);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  public playThreatStepAndBlade(pan: number, atten: number): void {
    if (!this.ctx || !this.masterGain || this.muted || atten <= 0.02) return;
    const now = this.ctx.currentTime;
    const panner = this.ctx.createStereoPanner();
    panner.pan.value = pan;
    panner.connect(this.masterGain);

    // Wet heavy footstep
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(86 * (0.92 + Math.random() * 0.14), now);
    osc.frequency.exponentialRampToValueAtTime(28, now + 0.12);
    g.gain.setValueAtTime(0.24 * atten, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    osc.connect(g);
    g.connect(panner);
    osc.start(now);
    osc.stop(now + 0.15);

    // Metallic surgical blade scraping floor
    if (this.noiseBuffer) {
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(2400 + Math.random() * 550, now + 0.04);
      bp.Q.value = 6.5;
      const sg = this.ctx.createGain();
      sg.gain.setValueAtTime(0.001, now + 0.03);
      sg.gain.linearRampToValueAtTime(0.07 * atten, now + 0.08);
      sg.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      src.connect(bp);
      bp.connect(sg);
      sg.connect(panner);
      src.start(now + 0.03);
      src.stop(now + 0.3);
    }
  }

  public playSpatialWhisper(pan: number, atten: number): void {
    if (!this.ctx || !this.masterGain || this.muted || atten <= 0.03) return;
    const now = this.ctx.currentTime;
    const panner = this.ctx.createStereoPanner();
    panner.pan.value = pan;
    panner.connect(this.masterGain);

    if (this.noiseBuffer) {
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      src.playbackRate.value = 0.72;
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(1150, now);
      bp.frequency.exponentialRampToValueAtTime(540, now + 0.45);
      bp.Q.value = 5;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.001, now);
      g.gain.linearRampToValueAtTime(0.16 * atten, now + 0.14);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
      src.connect(bp);
      bp.connect(g);
      g.connect(panner);
      src.start(now);
      src.stop(now + 0.58);
    }
  }

  public playCreakyBoard(): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(135, now);
    osc.frequency.linearRampToValueAtTime(92, now + 0.18);
    osc.frequency.linearRampToValueAtTime(148, now + 0.34);
    filter.type = 'bandpass';
    filter.frequency.value = 280;
    filter.Q.value = 5.5;
    g.gain.setValueAtTime(0.14, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
    osc.connect(filter);
    filter.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.4);
  }

  public playPropCrash(): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;
    if (this.noiseBuffer) {
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const hp = this.ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 1200;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.28, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.36);
      src.connect(hp);
      hp.connect(g);
      g.connect(this.masterGain);
      src.start(now);
      src.stop(now + 0.38);
    }
    const clang = this.ctx.createOscillator();
    const cg = this.ctx.createGain();
    clang.type = 'square';
    clang.frequency.setValueAtTime(320, now);
    clang.frequency.exponentialRampToValueAtTime(110, now + 0.25);
    cg.gain.setValueAtTime(0.16, now);
    cg.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    clang.connect(cg);
    cg.connect(this.masterGain);
    clang.start(now);
    clang.stop(now + 0.3);
  }

  public playSteamShutOff(): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;
    if (this.noiseBuffer) {
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(2200, now);
      bp.frequency.exponentialRampToValueAtTime(420, now + 0.7);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.22, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.75);
      src.connect(bp);
      bp.connect(g);
      g.connect(this.masterGain);
      src.start(now);
      src.stop(now + 0.78);
    }
  }

  public playPickup(): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;
    [480, 680].forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);
      g.gain.setValueAtTime(0.13, now + idx * 0.06);
      g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.2);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 0.22);
    });
  }

  public playDoorCreak(slam = false): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = slam ? 'square' : 'sawtooth';
    osc.frequency.setValueAtTime(slam ? 110 : 160, now);
    osc.frequency.exponentialRampToValueAtTime(slam ? 42 : 210, now + (slam ? 0.14 : 0.22));
    if (!slam) osc.frequency.linearRampToValueAtTime(115, now + 0.36);

    const filter = this.ctx.createBiquadFilter();
    filter.type = slam ? 'lowpass' : 'bandpass';
    filter.frequency.value = slam ? 360 : 320;
    filter.Q.value = 3.5;

    g.gain.setValueAtTime(slam ? 0.28 : 0.08, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + (slam ? 0.22 : 0.38));

    osc.connect(filter);
    filter.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.4);
  }

  public playUnlock(): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;
    [320, 480, 640].forEach((freq, i) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, now + i * 0.055);
      g.gain.setValueAtTime(0.09, now + i * 0.055);
      g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.055 + 0.16);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(now + i * 0.055);
      osc.stop(now + i * 0.055 + 0.18);
    });
  }

  public playLockedRattle(): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;
    [0, 0.08].forEach((off) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(110, now + off);
      osc.frequency.exponentialRampToValueAtTime(75, now + off + 0.06);
      g.gain.setValueAtTime(0.11, now + off);
      g.gain.exponentialRampToValueAtTime(0.001, now + off + 0.07);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(now + off);
      osc.stop(now + off + 0.08);
    });
  }

  public playBreakerOn(): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(85, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.45);
    g.gain.setValueAtTime(0.18, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.58);
  }

  public playThreatAlert(): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;
    [195, 209].forEach((freq) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.55, now + 0.42);
      g.gain.setValueAtTime(0.13, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.48);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.5);
    });
  }

  public playHit(): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(32, now + 0.35);
    g.gain.setValueAtTime(0.32, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.4);
  }

  public playJumpscareScreech(): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;
    [520, 585, 890, 94].forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = idx === 3 ? 'sawtooth' : 'square';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(idx === 3 ? 28 : freq * 1.28, now + 0.95);
      g.gain.setValueAtTime(0.22, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 1.05);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 1.08);
    });
  }

  public playVictory(): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;
    [330, 440, 554.37, 659.25].forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.09);
      g.gain.setValueAtTime(0.15, now + idx * 0.09);
      g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.5);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(now + idx * 0.09);
      osc.stop(now + idx * 0.09 + 0.55);
    });
  }

  public playMidnightQuake(): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;
    // Deep metallic structural groan & sub-bass collapse
    [46, 63, 92].forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = idx === 0 ? 'sine' : 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.52, now + 1.4);
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 260;
      g.gain.setValueAtTime(0.001, now);
      g.gain.linearRampToValueAtTime(idx === 0 ? 0.28 : 0.14, now + 0.12);
      g.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
      osc.connect(filter);
      filter.connect(g);
      g.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 1.55);
    });
  }

  public playArchitectureShift(): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(98, now);
    osc.frequency.exponentialRampToValueAtTime(36, now + 0.55);
    g.gain.setValueAtTime(0.16, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.62);
  }

  public dispose(): void {
    [this.droneOscA, this.droneOscB, this.tensionOscA, this.tensionOscB, this.spectralOsc].forEach((osc) => {
      if (osc) {
        try {
          osc.stop();
        } catch {
          // ignore
        }
      }
    });
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
  }
}
