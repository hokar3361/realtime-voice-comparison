import { GoogleGenAI, LiveConnectConfig, Session, Part, LiveCallbacks, LiveServerMessage, Modality } from "@google/genai";
import { EventEmitter } from "eventemitter3";

export interface GeminiClientEventTypes {
  audio: (data: ArrayBuffer) => void;
  close: (event: CloseEvent) => void;
  content: (data: any) => void;
  error: (error: Error | ErrorEvent) => void;
  interrupted: () => void;
  open: () => void;
  setupcomplete: () => void;
  turncomplete: () => void;
  log: (message: string) => void;
}

export class GeminiClient extends EventEmitter<GeminiClientEventTypes> {
  private client: GoogleGenAI;
  private session: Session | null = null;
  private _status: "connected" | "disconnected" | "connecting" = "disconnected";
  
  public get status() {
    return this._status;
  }

  constructor(apiKey: string) {
    super();
    this.client = new GoogleGenAI({ apiKey });
  }

  async connect(model: string = "models/gemini-2.5-flash-preview-native-audio-dialog", config: LiveConnectConfig = {}): Promise<boolean> {
    if (this._status === "connected" || this._status === "connecting") {
      this.emit("log", "Already connected or connecting");
      return false;
    }

    this._status = "connecting";
    this.emit("log", `Connecting to ${model}...`);

    const callbacks: LiveCallbacks = {
      onopen: () => {
        this._status = "connected";
        this.emit("log", "Connected to Gemini Live");
        this.emit("open");
      },
      onmessage: (message: LiveServerMessage) => {
        this.handleMessage(message);
      },
      onerror: (error: ErrorEvent) => {
        this.emit("log", `Error: ${error.message}`);
        this.emit("error", error);
      },
      onclose: (event: CloseEvent) => {
        this._status = "disconnected";
        this.emit("log", `Disconnected: ${event.reason || "Unknown reason"}`);
        this.emit("close", event);
      }
    };

    try {
      this.session = await this.client.live.connect({
        model,
        config,
        callbacks
      });
      
      this.emit("log", "Session created successfully");
      return true;
    } catch (e) {
      const error = e as Error;
      console.error("Error connecting to Gemini Live:", error);
      this.emit("log", `Connection failed: ${error.message}`);
      this.emit("error", error);
      this._status = "disconnected";
      return false;
    }
  }

  private handleMessage(message: LiveServerMessage) {
    // Handle setup complete
    if ('setupComplete' in message && message.setupComplete) {
      this.emit("log", "Setup complete");
      this.emit("setupcomplete");
      return;
    }

    // Handle server content
    if ('serverContent' in message && message.serverContent) {
      const serverContent = message.serverContent;
      
      if ('interrupted' in serverContent && serverContent.interrupted) {
        this.emit("log", "Response interrupted");
        this.emit("interrupted");
        return;
      }
      
      if ('turnComplete' in serverContent && serverContent.turnComplete) {
        this.emit("log", "Turn complete");
        this.emit("turncomplete");
        return;
      }

      if ('modelTurn' in serverContent && serverContent.modelTurn) {
        const parts: Part[] = serverContent.modelTurn.parts || [];
        
        // Handle audio parts
        const audioParts = parts.filter(
          (p) => p.inlineData && p.inlineData.mimeType?.startsWith("audio/pcm")
        );
        
        audioParts.forEach((part) => {
          if (part.inlineData?.data) {
            const data = this.base64ToArrayBuffer(part.inlineData.data);
            this.emit("audio", data);
            this.emit("log", `Received audio: ${data.byteLength} bytes`);
          }
        });

        // Handle text and other content
        const otherParts = parts.filter(
          (p) => !p.inlineData || !p.inlineData.mimeType?.startsWith("audio/pcm")
        );
        
        if (otherParts.length > 0) {
          this.emit("content", { modelTurn: { parts: otherParts } });
          const textParts = otherParts.filter(p => 'text' in p);
          if (textParts.length > 0) {
            this.emit("log", `Received text response`);
          }
        }
      }
    }
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  sendRealtimeInput(chunks: Array<Blob | { mimeType: string; data: string }>) {
    if (!this.session) {
      this.emit("log", "No active session");
      return;
    }

    let sent = 0;
    for (const chunk of chunks) {
      try {
        if (chunk instanceof Blob) {
          this.session.sendRealtimeInput({ media: chunk as any });
        } else {
          this.session.sendRealtimeInput({ media: chunk });
        }
        sent++;
      } catch (e) {
        const err = e as Error;
        this.emit("log", `sendRealtimeInput failed: ${err.message}`);
        this.emit("error", err);
      }
    }
    if (sent > 0) {
      this.emit("log", `Sent audio chunks: ${sent}`);
    }
  }

  send(parts: Part | Part[], turnComplete: boolean = true) {
    if (!this.session) {
      this.emit("log", "No active session");
      return;
    }

    const partsArray = Array.isArray(parts) ? parts : [parts];
    this.session.sendClientContent({ turns: partsArray, turnComplete });
    
    const textParts = partsArray.filter(p => 'text' in p);
    if (textParts.length > 0) {
      this.emit("log", `Sent text message`);
    }
  }

  /**
   * Signal end of user turn (useful after streaming audio input stops)
   */
  endTurn() {
    if (!this.session) {
      this.emit("log", "No active session");
      return;
    }
    try {
      this.session.sendClientContent({ turns: [], turnComplete: true });
      this.emit("log", "Sent turnComplete");
    } catch (e) {
      const err = e as Error;
      this.emit("log", `Failed to send turnComplete: ${err.message}`);
      this.emit("error", err);
    }
  }

  disconnect() {
    if (this.session) {
      this.session.close();
      this.session = null;
      this._status = "disconnected";
      this.emit("log", "Disconnected from Gemini");
      return true;
    }
    return false;
  }
}