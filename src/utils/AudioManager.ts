export type PlaySoundOptions = {
  volume?: number;
  loop?: boolean;
  offset?: number;
  when?: number;
};

export class AudioManager {
  private static instance: AudioManager;
  private audioContext: AudioContext;
  private soundBuffers: Map<string, AudioBuffer>;
  private loadingPromises: Map<string, Promise<void>>;
  private activeSources: Map<string, Set<AudioBufferSourceNode>> = new Map();
  private masterGainNode: GainNode;
  private masterVolume: number;

  private constructor() {
    this.audioContext = new AudioContext();
    this.soundBuffers = new Map();
    this.loadingPromises = new Map();
    this.masterVolume = localStorage.getItem("masterVolume")
      ? parseFloat(localStorage.getItem("masterVolume")!)
      : 1;
    this.masterGainNode = this.audioContext.createGain();
    this.masterGainNode.gain.value = this.masterVolume;
    this.masterGainNode.connect(this.audioContext.destination);
  }

  static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  async loadSound(soundPath: string): Promise<void> {
    if (
      this.soundBuffers.has(soundPath) ||
      this.loadingPromises.has(soundPath)
    ) {
      return;
    }

    const loadingPromise = fetch(soundPath)
      .then((response) => response.arrayBuffer())
      .then((arrayBuffer) => this.audioContext.decodeAudioData(arrayBuffer))
      .then((audioBuffer) => {
        this.soundBuffers.set(soundPath, audioBuffer);
      });

    this.loadingPromises.set(soundPath, loadingPromise);
    await loadingPromise;
  }

  playSound(soundPath: string, options?: PlaySoundOptions): void {
    const buffer = this.soundBuffers.get(soundPath);
    if (!buffer) {
      console.warn(`Sound not loaded: ${soundPath}`);
      return;
    }

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.loop = options?.loop ?? false;

    const gainNode = this.audioContext.createGain();
    gainNode.gain.value = options?.volume ?? 1;

    source.connect(gainNode);
    gainNode.connect(this.masterGainNode);

    // Track active source
    if (!this.activeSources.has(soundPath)) {
      this.activeSources.set(soundPath, new Set());
    }
    this.activeSources.get(soundPath)!.add(source);

    // Remove from active sources when it ends
    source.onended = () => {
      const sources = this.activeSources.get(soundPath);
      if (sources) {
        sources.delete(source);
      }
    };

    source.start(options?.when ?? 0, options?.offset ?? 0);
  }

  stopSound(soundPath: string): void {
    // Stop all active sources for this sound
    const activeSources = this.activeSources.get(soundPath);
    if (activeSources) {
      activeSources.forEach((source) => {
        try {
          source.stop();
        } catch (e) {
          // Source might already be stopped
        }
      });
      activeSources.clear();
    }
  }

  stopAllSounds(): void {
    this.activeSources.forEach((sources, soundPath) => {
      sources.forEach((source) => {
        try {
          source.stop();
        } catch (e) {
          // Source might already be stopped
        }
      });
      sources.clear();
    });
  }

  setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    this.masterGainNode.gain.value = this.masterVolume;
    localStorage.setItem("masterVolume", this.masterVolume.toString());
  }

  getMasterVolume(): number {
    return this.masterVolume;
  }
}
