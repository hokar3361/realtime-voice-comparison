export class AudioStreamer {
  private audioContext: AudioContext;
  private audioQueue: Float32Array[] = [];
  private isPlaying: boolean = false;
  private sampleRate: number = 24000; // Default for both APIs

  constructor() {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }

  addPCM16(pcm16Data: Uint8Array) {
    // Convert PCM16 to Float32
    const float32Data = new Float32Array(pcm16Data.length / 2);
    const dataView = new DataView(pcm16Data.buffer);
    
    for (let i = 0; i < float32Data.length; i++) {
      const sample = dataView.getInt16(i * 2, true); // Little-endian
      float32Data[i] = sample / 32768.0; // Convert to -1.0 to 1.0 range
    }
    
    this.audioQueue.push(float32Data);
    
    if (!this.isPlaying) {
      this.playQueue();
    }
  }

  private async playQueue() {
    if (this.audioQueue.length === 0) {
      this.isPlaying = false;
      return;
    }

    this.isPlaying = true;
    const audioData = this.audioQueue.shift()!;
    
    const audioBuffer = this.audioContext.createBuffer(
      1, // Mono
      audioData.length,
      this.sampleRate
    );
    
    // Create a new Float32Array with the correct ArrayBuffer type
    const channelData = audioBuffer.getChannelData(0);
    for (let i = 0; i < audioData.length; i++) {
      channelData[i] = audioData[i];
    }
    
    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioContext.destination);
    
    source.onended = () => {
      this.playQueue();
    };
    
    source.start();
  }

  stop() {
    this.audioQueue = [];
    this.isPlaying = false;
  }

  setSampleRate(rate: number) {
    this.sampleRate = rate;
  }
}

export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private audioContext: AudioContext;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private onDataCallback: ((data: ArrayBuffer) => void) | null = null;

  constructor(sampleRate: number = 16000) {
    // Prefer a 16kHz context for Gemini Live input
    const Ctx = (window.AudioContext || (window as any).webkitAudioContext);
    try {
      this.audioContext = new Ctx({ sampleRate });
    } catch (_) {
      // Fallback if sampleRate option not supported
      this.audioContext = new Ctx();
    }
  }

  async start(onData: (data: ArrayBuffer) => void) {
    this.onDataCallback = onData;
    
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.source = this.audioContext.createMediaStreamSource(this.stream);
      
      // Create a script processor for real-time audio processing
      // Use smaller buffer (256) to reduce latency and match sample app
      const bufferSize = 256;
      this.processor = this.audioContext.createScriptProcessor(bufferSize, 1, 1);
      
      this.processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        
        // Convert Float32 to PCM16
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const sample = Math.max(-1, Math.min(1, inputData[i]));
          pcm16[i] = sample < 0 ? sample * 32768 : sample * 32767;
        }
        
        if (this.onDataCallback) {
          this.onDataCallback(pcm16.buffer);
        }
      };
      
      this.source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);
    } catch (error) {
      console.error("Error starting audio recording:", error);
      throw error;
    }
  }

  stop() {
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    
    this.onDataCallback = null;
  }

  isRecording(): boolean {
    return this.stream !== null;
  }
}

// Utility function to convert ArrayBuffer to base64
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
