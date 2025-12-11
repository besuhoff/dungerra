export class AudioManager {
  private static instance: AudioManager;
  private audioContext: AudioContext;
  private soundBuffers: Map<string, AudioBuffer>;
  private loadingPromises: Map<string, Promise<void>>;
  private activeSources: Map<string, Set<AudioBufferSourceNode>> = new Map();

  private constructor() {
    this.audioContext = new AudioContext();
    this.soundBuffers = new Map();
    this.loadingPromises = new Map();
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

  playSound(
    soundPath: string,
    volume: number = 1,
    loop: boolean = false
  ): void {
    const buffer = this.soundBuffers.get(soundPath);
    if (!buffer) {
      console.warn(`Sound not loaded: ${soundPath}`);
      return;
    }

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.loop = loop;

    const gainNode = this.audioContext.createGain();
    gainNode.gain.value = volume;

    source.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

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

    source.start();
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
}
