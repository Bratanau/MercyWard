export class HorrorAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private ambientGain: GainNode | null = null;

  private droneOscA: OscillatorNode | null = null;
  private droneOscB: OscillatorNode | null = null;
  private droneGain: GainNode | null = null;
  private tensionOscA: OscillatorNode | null = null;
  private tensionOscB: OscillatorNode | null = null;
  private tensionGain: GainNode | null = null;
  private spectralOsc: OscillatorNode | null = null;
  private spectralGain: GainNode | null = null;
  private radioStaticSource: AudioBufferSourceNode | null = null;
  private radioStaticGain: GainNode | null = null;
  private windSource: AudioBufferSourceNode | null = null;
  private windGain: GainNode | null = null;

  private noiseBuffer: AudioBuffer | null = null;

  private muted = false;
  private sfxVolume = 0.75;
  private ambientVolume = 0.65;
  private glassesAudioActive = false;
  private glassesWhisperTimer = 0;
  private heartbeatTimer = 0;
  private chasePulseTimer = 0;
  private groanTimer = 7;
  private dripTimer = 3.5;

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
      this.masterGain.gain.value = this.muted ? 0 : 0.72;
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = this.sfxVolume;
      this.sfxGain.connect(this.masterGain);

      this.ambientGain = this.ctx.createGain();
      this.ambientGain.gain.value = this.ambientVolume;
      this.ambientGain.connect(this.masterGain);

      // Reusable 2.0s white noise buffer for steam, wind, static radio, whispers, glass shatters
      const sampleRate = this.ctx.sampleRate;
      const len = Math.floor(sampleRate * 2.0);
      this.noiseBuffer = this.ctx.createBuffer(1, len, sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < len; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      // Track 1 (Exploration): Hollow liminal wind hiss
      const windFilter = this.ctx.createBiquadFilter();
      windFilter.type = 'bandpass';
      windFilter.frequency.value = 310;
      windFilter.Q.value = 1.6;
      this.windGain = this.ctx.createGain();
      this.windGain.gain.value = 0.0001;
      this.windSource = this.ctx.createBufferSource();
      this.windSource.buffer = this.noiseBuffer;
      this.windSource.loop = true;
      this.windSource.connect(windFilter);
      windFilter.connect(this.windGain);
      this.windGain.connect(this.ambientGain);
      this.windSource.start();

      // Track 2 (Basement / Paranoia): Sub-bass mechanical rumble (36Hz + 58Hz) + Radio Static
      const droneFilter = this.ctx.createBiquadFilter();
      droneFilter.type = 'lowpass';
      droneFilter.frequency.value = 135;

      this.droneGain = this.ctx.createGain();
      this.droneGain.gain.value = 0.03;

      this.droneOscA = this.ctx.createOscillator();
      this.droneOscA.type = 'sine';
      this.droneOscA.frequency.value = 36;

      this.droneOscB = this.ctx.createOscillator();
      this.droneOscB.type = 'triangle';
      this.droneOscB.frequency.value = 58;

      this.droneOscA.connect(droneFilter);
      this.droneOscB.connect(droneFilter);
      droneFilter.connect(this.droneGain);
      this.droneGain.connect(this.ambientGain);
      this.droneOscA.start();
      this.droneOscB.start();

      const radioFilter = this.ctx.createBiquadFilter();
      radioFilter.type = 'bandpass';
      radioFilter.frequency.value = 1650;
      radioFilter.Q.value = 2.4;
      this.radioStaticGain = this.ctx.createGain();
      this.radioStaticGain.gain.value = 0.0001;
      this.radioStaticSource = this.ctx.createBufferSource();
      this.radioStaticSource.buffer = this.noiseBuffer;
      this.radioStaticSource.loop = true;
      this.radioStaticSource.connect(radioFilter);
      radioFilter.connect(this.radioStaticGain);
      this.radioStaticGain.connect(this.sfxGain);
      this.radioStaticSource.start();

      // Track 3 (Immediate Chase): Dissonant rising string screech texture
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
      this.tensionOscB.frequency.value = 441;

      this.tensionOscA.connect(tensionFilter);
      this.tensionOscB.connect(tensionFilter);
      tensionFilter.connect(this.tensionGain);
      this.tensionGain.connect(this.ambientGain);
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
      this.spectralGain.connect(this.sfxGain);
      this.spectralOsc.start();
    } catch {
      this.ctx = null;
    }
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.72, this.ctx.currentTime, 0.04);
    }
  }

  public setVolumes(sfxVolume: number, ambientVolume: number): void {
    this.sfxVolume = sfxVolume;
    this.ambientVolume = ambientVolume;
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (this.sfxGain) {
      this.sfxGain.gain.setTargetAtTime(sfxVolume, now, 0.04);
    }
    if (this.ambientGain) {
      this.ambientGain.gain.setTargetAtTime(ambientVolume, now, 0.04);
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setAmbienceActive(active: boolean): void {
    if (!this.ctx || !this.droneGain || !this.tensionGain || !this.windGain) return;
    const now = this.ctx.currentTime;
    this.droneGain.gain.setTargetAtTime(active ? 0.06 : 0.015, now, 0.25);
    this.windGain.gain.setTargetAtTime(active ? 0.028 : 0.008, now, 0.25);
    if (!active) {
      this.tensionGain.gain.setTargetAtTime(0.0001, now, 0.12);
      if (this.radioStaticGain) this.radioStaticGain.gain.setTargetAtTime(0.0001, now, 0.1);
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

  public updateAdaptiveScore(
    dt: number,
    dangerLevel: number,
    isChasing: boolean,
    radioStaticLevel = 0,
    isBasementOrBoiler = false
  ): void {
    if (!this.ctx || !this.masterGain || this.muted) {
      this.heartbeatTimer = 0;
      this.chasePulseTimer = 0;
      return;
    }

    const now = this.ctx.currentTime;

    // Crossfade Ambient Tracks 1, 2 & 3
    if (this.windGain && this.droneGain && this.tensionGain) {
      const windLevel = isChasing ? 0.008 : Math.max(0.012, 0.036 * (1 - dangerLevel * 0.6));
      const paranoiaWeight = isBasementOrBoiler ? 0.11 : 0.045 + dangerLevel * 0.07;
      const chaseWeight = isChasing ? 0.085 : dangerLevel > 0.25 ? (dangerLevel - 0.25) * 0.075 : 0.0001;

      this.windGain.gain.setTargetAtTime(windLevel, now, 0.22);
      this.droneGain.gain.setTargetAtTime(paranoiaWeight, now, 0.22);
      this.tensionGain.gain.setTargetAtTime(chaseWeight, now, 0.14);
    }

    if (this.tensionOscA && this.tensionOscB) {
      const pitchShift = 1 + dangerLevel * 0.18;
      this.tensionOscA.frequency.setTargetAtTime(415 * pitchShift, now, 0.18);
      this.tensionOscB.frequency.setTargetAtTime(441 * pitchShift, now, 0.18);
    }

    // Pocket Radio Static scaled by distance <= 25m
    if (this.radioStaticGain) {
      const staticTarget = radioStaticLevel > 0.02 ? 0.012 + radioStaticLevel * 0.095 : 0.0001;
      this.radioStaticGain.gain.setTargetAtTime(staticTarget, now, 0.1);
    }

    // Echoing Water Drips during Exploration
    if (!isChasing && dangerLevel < 0.45) {
      this.dripTimer -= dt;
      if (this.dripTimer <= 0) {
        this.dripTimer = 3.2 + Math.random() * 4.5;
        this.playWaterDrip((Math.random() - 0.5) * 1.6);
      }
    }

    // Distant metallic building groans
    this.groanTimer -= dt;
    if (this.groanTimer <= 0) {
      this.groanTimer = 9 + Math.random() * 8;
      this.playBuildingGroan();
    }

    // Binaural Heartbeat (70 -> 144 BPM as danger climbs)
    if (dangerLevel >= 0.18) {
      const bpm = 70 + dangerLevel * 74;
      const beatInterval = 60 / bpm;
      this.heartbeatTimer -= dt;
      if (this.heartbeatTimer <= 0) {
        this.heartbeatTimer = beatInterval;
        this.playHeartbeatPulse(0.07 + dangerLevel * 0.24);
      }
    } else {
      this.heartbeatTimer = 0;
    }

    // Chase State: Industrial thud + frantic breathing
    if (isChasing) {
      this.chasePulseTimer -= dt;
      if (this.chasePulseTimer <= 0) {
        this.chasePulseTimer = 0.42;
        this.playChaseIndustrialHit();
      }
    } else {
      this.chasePulseTimer = 0;
    }

    // Spectral Glasses active whispers
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

  private playWaterDrip(pan: number): void {
    if (!this.ctx || !this.ambientGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    const panner = this.ctx.createStereoPanner();
    panner.pan.value = pan;
    osc.type = 'sine';
    const base = 1150 + Math.random() * 450;
    osc.frequency.setValueAtTime(base, now);
    osc.frequency.exponentialRampToValueAtTime(base * 1.48, now + 0.06);
    g.gain.setValueAtTime(0.035, now);
    g.gain.exponentialRampToValueAtTime(0.0008, now + 0.14);
    osc.connect(g);
    g.connect(panner);
    panner.connect(this.ambientGain);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  private playBuildingGroan(): void {
    if (!this.ctx || !this.ambientGain) return;
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
    g.connect(this.ambientGain);
    osc.start(now);
    osc.stop(now + 2.0);
  }

  private playHeartbeatPulse(gainPeak: number): void {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const thump = (offset: number, freq: number, amp: number, pan: number) => {
      if (!this.ctx || !this.sfxGain) return;
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
      panner.connect(this.sfxGain);
      osc.start(now + offset);
      osc.stop(now + offset + 0.18);
    };
    thump(0, 68, gainPeak, -0.18);
    thump(0.14, 54, gainPeak * 0.68, 0.18);
  }

  private playChaseIndustrialHit(): void {
    if (!this.ctx || !this.ambientGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(115, now);
    osc.frequency.exponentialRampToValueAtTime(34, now + 0.16);
    g.gain.setValueAtTime(0.14, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc.connect(g);
    g.connect(this.ambientGain);
    osc.start(now);
    osc.stop(now + 0.2);

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
      ng.connect(this.ambientGain);
      src.start(now);
      src.stop(now + 0.25);
    }
  }

  public playPlayerFootstep(crouching: boolean, sprinting: boolean): void {
    if (!this.ctx || !this.sfxGain || this.muted) return;
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
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  /**
   * Resident footsteps + bone-clicking joints + wet guttural breathing & dragging blade.
   */
  public playThreatStepAndBlade(pan: number, atten: number): void {
    if (!this.ctx || !this.sfxGain || this.muted || atten <= 0.02) return;
    const now = this.ctx.currentTime;
    const panner = this.ctx.createStereoPanner();
    panner.pan.value = pan;
    panner.connect(this.sfxGain);

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

    // Uncanny joint bone-click + wet throat click (~35% per step)
    if (Math.random() < 0.45) {
      const click = this.ctx.createOscillator();
      const cg = this.ctx.createGain();
      click.type = 'square';
      click.frequency.setValueAtTime(1450 + Math.random() * 600, now + 0.06);
      click.frequency.exponentialRampToValueAtTime(320, now + 0.09);
      cg.gain.setValueAtTime(0.075 * atten, now + 0.06);
      cg.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      click.connect(cg);
      cg.connect(panner);
      click.start(now + 0.06);
      click.stop(now + 0.11);
    }

    // Metallic blade scraping + guttural rasp
    if (this.noiseBuffer) {
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(2200 + Math.random() * 550, now + 0.04);
      bp.Q.value = 6.2;
      const sg = this.ctx.createGain();
      sg.gain.setValueAtTime(0.001, now + 0.03);
      sg.gain.linearRampToValueAtTime(0.075 * atten, now + 0.08);
      sg.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      src.connect(bp);
      bp.connect(sg);
      sg.connect(panner);
      src.start(now + 0.03);
      src.stop(now + 0.3);
    }
  }

  public playSpatialWhisper(pan: number, atten: number): void {
    if (!this.ctx || !this.sfxGain || this.muted || atten <= 0.03) return;
    const now = this.ctx.currentTime;
    const panner = this.ctx.createStereoPanner();
    panner.pan.value = pan;
    panner.connect(this.sfxGain);

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
      g.gain.linearRampToValueAtTime(0.18 * atten, now + 0.14);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
      src.connect(bp);
      bp.connect(g);
      g.connect(panner);
      src.start(now);
      src.stop(now + 0.58);
    }
  }

  public playBottleShatter(pan: number, atten: number): void {
    if (!this.ctx || !this.sfxGain || this.muted) return;
    const now = this.ctx.currentTime;
    const panner = this.ctx.createStereoPanner();
    panner.pan.value = pan;
    panner.connect(this.sfxGain);
    const scale = Math.max(0.25, atten);

    if (this.noiseBuffer) {
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const hp = this.ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 2600;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.36 * scale, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
      src.connect(hp);
      hp.connect(g);
      g.connect(panner);
      src.start(now);
      src.stop(now + 0.45);
    }

    [1950, 2740, 3420].forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.03);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.65, now + idx * 0.03 + 0.14);
      g.gain.setValueAtTime(0.11 * scale, now + idx * 0.03);
      g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.03 + 0.16);
      osc.connect(g);
      g.connect(panner);
      osc.start(now + idx * 0.03);
      osc.stop(now + idx * 0.03 + 0.18);
    });
  }

  public playPhoneRing(pan: number, atten: number): void {
    if (!this.ctx || !this.sfxGain || this.muted || atten <= 0.04) return;
    const now = this.ctx.currentTime;
    const panner = this.ctx.createStereoPanner();
    panner.pan.value = pan;
    panner.connect(this.sfxGain);

    for (let burst = 0; burst < 2; burst++) {
      const t0 = now + burst * 0.22;
      [1120, 1480].forEach((freq) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t0);
        g.gain.setValueAtTime(0.14 * atten, t0);
        g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.16);
        osc.connect(g);
        g.connect(panner);
        osc.start(t0);
        osc.stop(t0 + 0.18);
      });
    }
  }

  public playGhostFootstepsBehind(): void {
    if (!this.ctx || !this.sfxGain || this.muted) return;
    const now = this.ctx.currentTime;
    [0, 0.19, 0.37, 0.54].forEach((off, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(102 - idx * 4, now + off);
      osc.frequency.exponentialRampToValueAtTime(30, now + off + 0.11);
      g.gain.setValueAtTime(0.24 + idx * 0.04, now + off);
      g.gain.exponentialRampToValueAtTime(0.001, now + off + 0.13);
      osc.connect(g);
      g.connect(this.sfxGain);
      osc.start(now + off);
      osc.stop(now + off + 0.14);
    });
  }

  public playDevourCrunch(): void {
    if (!this.ctx || !this.sfxGain || this.muted) return;
    const now = this.ctx.currentTime;
    // Unhinged screech + bone snap
    [520, 610, 940, 88].forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = idx === 3 ? 'sawtooth' : 'square';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(idx === 3 ? 26 : freq * 1.32, now + 1.15);
      g.gain.setValueAtTime(0.24, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 1.25);
      osc.connect(g);
      g.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 1.28);
    });
    if (this.noiseBuffer) {
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 1400;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.32, now + 0.25);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.72);
      src.connect(bp);
      bp.connect(g);
      g.connect(this.sfxGain);
      src.start(now + 0.25);
      src.stop(now + 0.75);
    }
  }

  public playRebirthBreathing(): void {
    if (!this.ctx || !this.sfxGain || this.muted || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.playbackRate.value = 0.65;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(420, now);
    bp.frequency.linearRampToValueAtTime(760, now + 0.65);
    bp.frequency.linearRampToValueAtTime(340, now + 1.35);
    bp.Q.value = 2.6;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(0.24, now + 0.45);
    g.gain.exponentialRampToValueAtTime(0.001, now + 1.45);
    src.connect(bp);
    bp.connect(g);
    g.connect(this.sfxGain);
    src.start(now);
    src.stop(now + 1.5);
  }

  public playCreakyBoard(): void {
    if (!this.ctx || !this.sfxGain || this.muted) return;
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
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.4);
  }

  public playPropCrash(): void {
    if (!this.ctx || !this.sfxGain || this.muted) return;
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
      g.connect(this.sfxGain);
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
    cg.connect(this.sfxGain);
    clang.start(now);
    clang.stop(now + 0.3);
  }

  public playSteamShutOff(): void {
    if (!this.ctx || !this.sfxGain || this.muted) return;
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
      g.connect(this.sfxGain);
      src.start(now);
      src.stop(now + 0.78);
    }
  }

  public playPickup(): void {
    if (!this.ctx || !this.sfxGain || this.muted) return;
    const now = this.ctx.currentTime;
    [480, 680].forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);
      g.gain.setValueAtTime(0.13, now + idx * 0.06);
      g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.2);
      osc.connect(g);
      g.connect(this.sfxGain);
      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 0.22);
    });
  }

  public playDoorCreak(slam = false): void {
    if (!this.ctx || !this.sfxGain || this.muted) return;
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
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.4);
  }

  public playUnlock(): void {
    if (!this.ctx || !this.sfxGain || this.muted) return;
    const now = this.ctx.currentTime;
    [320, 480, 640].forEach((freq, i) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, now + i * 0.055);
      g.gain.setValueAtTime(0.09, now + i * 0.055);
      g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.055 + 0.16);
      osc.connect(g);
      g.connect(this.sfxGain);
      osc.start(now + i * 0.055);
      osc.stop(now + i * 0.055 + 0.18);
    });
  }

  public playLockedRattle(): void {
    if (!this.ctx || !this.sfxGain || this.muted) return;
    const now = this.ctx.currentTime;
    [0, 0.08].forEach((off) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(110, now + off);
      osc.frequency.exponentialRampToValueAtTime(75, now + off + 0.06);
      g.gain.setValueAtTime(0.11, now + off);
      g.gain.exponentialRampToValueAtTime(0.001, now + off + 0.07);
      osc.connect(g);
      g.connect(this.sfxGain);
      osc.start(now + off);
      osc.stop(now + off + 0.08);
    });
  }

  public playBreakerOn(): void {
    if (!this.ctx || !this.sfxGain || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(85, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.45);
    g.gain.setValueAtTime(0.18, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.58);
  }

  public playThreatAlert(): void {
    if (!this.ctx || !this.sfxGain || this.muted) return;
    const now = this.ctx.currentTime;
    [195, 209].forEach((freq) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.55, now + 0.42);
      g.gain.setValueAtTime(0.14, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.48);
      osc.connect(g);
      g.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.5);
    });
  }

  public playHit(): void {
    if (!this.ctx || !this.sfxGain || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(32, now + 0.35);
    g.gain.setValueAtTime(0.32, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.4);
  }

  public playVictory(): void {
    if (!this.ctx || !this.sfxGain || this.muted) return;
    const now = this.ctx.currentTime;
    [330, 440, 554.37, 659.25].forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.09);
      g.gain.setValueAtTime(0.15, now + idx * 0.09);
      g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.5);
      osc.connect(g);
      g.connect(this.sfxGain);
      osc.start(now + idx * 0.09);
      osc.stop(now + idx * 0.09 + 0.55);
    });
  }

  public playMidnightQuake(): void {
    if (!this.ctx || !this.sfxGain || this.muted) return;
    const now = this.ctx.currentTime;
    [46, 63, 92].forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
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
      g.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 1.55);
    });
  }

  public playArchitectureShift(): void {
    if (!this.ctx || !this.sfxGain || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(98, now);
    osc.frequency.exponentialRampToValueAtTime(36, now + 0.55);
    g.gain.setValueAtTime(0.16, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.62);
  }

  public dispose(): void {
    [
      this.droneOscA,
      this.droneOscB,
      this.tensionOscA,
      this.tensionOscB,
      this.spectralOsc,
      this.radioStaticSource,
      this.windSource,
    ].forEach((node) => {
      if (node) {
        try {
          node.stop();
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
