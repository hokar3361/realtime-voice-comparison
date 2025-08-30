/**
 * Sound Effects Manager
 * Handles playing various sound effects for UI feedback
 */

export type SoundEffect = 
  | 'connect' 
  | 'disconnect' 
  | 'ready' 
  | 'start-speaking' 
  | 'stop-speaking' 
  | 'error' 
  | 'notification';

interface SoundConfig {
  volume: number;
  playbackRate: number;
}

class SoundEffectsManager {
  private audioCache: Map<SoundEffect, HTMLAudioElement> = new Map();
  private enabled: boolean = true;
  private globalVolume: number = 0.3; // Default volume

  // Sound file paths - you can customize these
  private soundPaths: Record<SoundEffect, string> = {
    connect: '/sounds/connect.mp3',
    disconnect: '/sounds/disconnect.mp3',
    ready: '/sounds/ready.wav',
    'start-speaking': '/sounds/start-speaking.wav',
    'stop-speaking': '/sounds/stop-speaking.wav',
    error: '/sounds/error.wav',
    notification: '/sounds/notification.wav',
  };

  constructor() {
    this.preloadSounds();
  }

  /**
   * Preload all sound files for smooth playback
   */
  private async preloadSounds() {
    console.log('Starting to preload sound effects...');
    
    for (const [effect, path] of Object.entries(this.soundPaths)) {
      try {
        console.log(`Preloading sound: ${effect} from ${path}`);
        const audio = new Audio(path);
        audio.preload = 'auto';
        audio.volume = this.globalVolume;
        
        // Handle loading success
        audio.addEventListener('canplaythrough', () => {
          console.log(`Successfully loaded sound: ${effect}`);
        });
        
        // Handle loading errors gracefully
        audio.addEventListener('error', (e) => {
          console.warn(`Failed to load sound effect: ${effect} from ${path}`, e);
        });

        this.audioCache.set(effect as SoundEffect, audio);
      } catch (error) {
        console.warn(`Error preloading sound ${effect}:`, error);
      }
    }
    
    console.log(`Preloaded ${this.audioCache.size} sound effects`);
  }

     /**
    * Play a sound effect
    */
   async play(
     effect: SoundEffect, 
     config: Partial<SoundConfig> = {}
   ): Promise<void> {
     if (!this.enabled) {
       console.log(`Sound effects disabled, skipping: ${effect}`);
       return;
     }

     const audio = this.audioCache.get(effect);
     if (!audio) {
       console.warn(`Sound effect not found: ${effect}`);
       // Try to play fallback beep
       if (effect === 'connect') {
         await this.playBeep(800, 300, 0.3);
       } else if (effect === 'ready') {
         await this.playBeep(1000, 200, 0.2);
       }
       return;
     }

     try {
       console.log(`Playing sound effect: ${effect}`);
       
       // Reset audio to beginning
       audio.currentTime = 0;
       
       // Apply configuration
       const finalVolume = (config.volume ?? 1) * this.globalVolume;
       audio.volume = finalVolume;
       audio.playbackRate = config.playbackRate ?? 1;

       console.log(`Sound config - Volume: ${finalVolume}, Rate: ${audio.playbackRate}`);

       // Play the sound
       await audio.play();
       console.log(`Successfully played: ${effect}`);
     } catch (error) {
       console.error(`Failed to play sound effect ${effect}:`, error);
       
       // Try fallback beep on error
       if (effect === 'connect') {
         await this.playBeep(800, 300, 0.3);
       } else if (effect === 'ready') {
         await this.playBeep(1000, 200, 0.2);
       }
     }
   }

  /**
   * Set global volume for all sound effects
   */
  setGlobalVolume(volume: number) {
    this.globalVolume = Math.max(0, Math.min(1, volume));
    
    // Update volume for all cached audio elements
    this.audioCache.forEach(audio => {
      audio.volume = this.globalVolume;
    });
  }

  /**
   * Enable or disable sound effects
   */
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  /**
   * Check if sound effects are enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Generate simple beep sounds programmatically (fallback)
   */
  async playBeep(
    frequency: number = 800, 
    duration: number = 200, 
    volume: number = 0.1
  ): Promise<void> {
    if (!this.enabled) return;

    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(volume * this.globalVolume, audioContext.currentTime + 0.01);
      gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + duration / 1000);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + duration / 1000);

      // Clean up
      setTimeout(() => {
        oscillator.disconnect();
        gainNode.disconnect();
        audioContext.close();
      }, duration + 100);
    } catch (error) {
      console.warn('Failed to play beep:', error);
    }
  }

  /**
   * Play connection success sound
   */
  async playConnectSuccess() {
    await this.play('connect', { volume: 0.8 });
  }

  /**
   * Play ready/listening sound
   */
  async playReady() {
    await this.play('ready', { volume: 0.6 });
  }

  /**
   * Play error sound
   */
  async playError() {
    await this.play('error', { volume: 0.7 });
  }

  /**
   * Play speaking start sound
   */
  async playSpeakingStart() {
    await this.play('start-speaking', { volume: 0.4, playbackRate: 1.2 });
  }

  /**
   * Play speaking stop sound
   */
  async playSpeakingStop() {
    await this.play('stop-speaking', { volume: 0.4, playbackRate: 0.8 });
  }
}

// Export singleton instance
export const soundEffects = new SoundEffectsManager();

// Export class for testing or custom instances
export { SoundEffectsManager };
