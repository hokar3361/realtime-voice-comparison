/**
 * OpenAI Realtime API Client
 * Provides WebRTC and WebSocket connections to OpenAI's realtime API
 */

import { EventEmitter } from "eventemitter3";

export interface OpenAIRealtimeEventTypes {
  audio: (data: ArrayBuffer) => void;
  close: () => void;
  content: (data: any) => void;
  error: (error: Error) => void;
  interrupted: () => void;
  open: () => void;
  turncomplete: () => void;
}

export type ConnectionType = 'webrtc' | 'websocket';

export class OpenAIRealtimeClient extends EventEmitter<OpenAIRealtimeEventTypes> {
  private ws: WebSocket | null = null;
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private apiKey: string;
  private connectionType: ConnectionType;
  private _status: "connected" | "disconnected" | "connecting" = "disconnected";
  private initialConfig: any | null = null;
  
  public get status() {
    return this._status;
  }

  constructor(apiKey: string, connectionType: ConnectionType = 'webrtc') {
    super();
    this.apiKey = apiKey;
    this.connectionType = connectionType;
  }

  async connect(model: string = "gpt-realtime", config: any = {}): Promise<boolean> {
    if (this._status === "connected" || this._status === "connecting") {
      return false;
    }

    this._status = "connecting";

    try {
      if (this.connectionType === 'webrtc') {
        return await this.connectWebRTC(model, config);
      } else {
        return await this.connectWebSocket(model, config);
      }
    } catch (e) {
      console.error("Error connecting to OpenAI Realtime:", e);
      this._status = "disconnected";
      return false;
    }
  }

  private async connectWebRTC(model: string, config: any): Promise<boolean> {
    try {
      console.log("WebRTC config received:", config);
      console.log("WebRTC config.voice:", config.voice);
      // Get ephemeral token (in production, this should come from your backend)
      const ephemeralKey = await this.getEphemeralKey(model, config);
      this.initialConfig = config;
      
      // Create peer connection
      this.pc = new RTCPeerConnection();
      
      // Set up audio playback
      this.audioElement = document.createElement("audio");
      this.audioElement.autoplay = true;
      this.pc.ontrack = (e) => {
        if (this.audioElement) {
          this.audioElement.srcObject = e.streams[0];
        }
      };
      
      // Add local audio track for microphone
      try {
        const ms = await navigator.mediaDevices.getUserMedia({ audio: true });
        ms.getTracks().forEach(track => {
          this.pc?.addTrack(track, ms);
        });
      } catch (e) {
        console.error("Failed to get microphone access:", e);
      }
      
      // Set up data channel for events
      this.dc = this.pc.createDataChannel("oai-events");
      this.setupDataChannel();
      
      // Create and send offer
      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);
      
      const baseUrl = "https://api.openai.com/v1/realtime/calls";
      const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
        method: "POST",
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${ephemeralKey}`,
          "Content-Type": "application/sdp",
        },
      });
      
      if (!sdpResponse.ok) {
        throw new Error(`Failed to connect: ${sdpResponse.statusText}`);
      }
      
      const answer = {
        type: "answer" as RTCSdpType,
        sdp: await sdpResponse.text(),
      };
      await this.pc.setRemoteDescription(answer);
      
      this._status = "connected";
      this.emit("open");
      
      return true;
    } catch (e) {
      console.error("WebRTC connection error:", e);
      throw e;
    }
  }

  private async connectWebSocket(model: string, config: any): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const url = `wss://api.openai.com/v1/realtime?model=${model}`;
      
      this.ws = new WebSocket(url);
      
      // Note: In browser, we can't set headers directly on WebSocket
      // You'll need to use an ephemeral token in the URL or use a proxy
      
      this.ws.onopen = () => {
        this._status = "connected";
        this.emit("open");
        
        // Send session configuration
        console.log("WebSocket config received:", config);
        console.log("WebSocket config.voice:", config.voice);
        this.send({
          type: "session.update",
          session: {
            type: "realtime",
            model: model,
            output_modalities: ["audio", "text"],
            audio: {
              input: {
                format: "pcm16",
                turn_detection: { 
                  type: "semantic_vad", 
                  create_response: true 
                }
              },
              output: {
                format: "pcm16",
                voice: config.voice || "marin",
                speed: 1.0
              }
            },
            instructions: config.instructions || "You are a helpful assistant. Respond in the same language as the user."
          }
        });
        
        resolve(true);
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (e) {
          console.error("Error parsing message:", e);
        }
      };

      this.ws.onerror = () => {
        this.emit("error", new Error("WebSocket error"));
        reject(new Error("WebSocket connection failed"));
      };

      this.ws.onclose = () => {
        this._status = "disconnected";
        this.emit("close");
      };
      
      // Set timeout for connection
      setTimeout(() => {
        if (this._status !== "connected") {
          reject(new Error("Connection timeout"));
        }
      }, 10000);
    });
  }

  private setupDataChannel() {
    if (!this.dc) return;
    
    this.dc.onopen = () => {
      console.log("Data channel opened");
      if (this.initialConfig) {
        console.log("Sending initial config via data channel:", this.initialConfig);
        this.send({
          type: "session.update",
          session: {
            type: "realtime",
            audio: { 
              output: { 
                voice: this.initialConfig.voice || "marin" 
              } 
            },
            instructions: this.initialConfig.instructions || "You are a helpful assistant."
          }
        });
        this.initialConfig = null;
      }
    };
    
    this.dc.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (e) {
        console.error("Error parsing data channel message:", e);
      }
    };
    
    this.dc.onerror = (error) => {
      console.error("Data channel error:", error);
      this.emit("error", new Error("Data channel error"));
    };
  }

  private async getEphemeralKey(model: string, config: any): Promise<string> {
    // In production, this should be done on your backend server
    // For demo purposes, we'll use the API key directly (NOT SECURE FOR PRODUCTION)
    
    try {
      const response = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          session: {
            type: "realtime",
            model: model,
            audio: {
              output: {
                voice: config.voice || "marin",
              },
            },
            instructions: config.instructions || "You are a helpful assistant. Respond in the same language as the user."
          },
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to get ephemeral key: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.value;
    } catch (e) {
      console.error("Failed to get ephemeral key:", e);
      // Fallback to using the API key directly (for testing only)
      return this.apiKey;
    }
  }

  private sendConfig(config: any) {
    this.send({
      type: "session.update",
      session: {
        type: "realtime",
        instructions: config.instructions || "You are a helpful assistant.",
        audio: {
          output: {
            voice: config.voice || "marin",
          }
        },
        ...config
      }
    });
  }

  private handleMessage(message: any) {
    switch (message.type) {
      case "session.created":
      case "session.updated":
        // Session established/updated
        break;
        
      case "response.audio.delta":
        // Audio chunk received (WebSocket only, WebRTC handles audio automatically)
        if (message.delta && this.connectionType === 'websocket') {
          const audioData = this.base64ToArrayBuffer(message.delta);
          this.emit("audio", audioData);
        }
        break;
        
      case "response.text.delta":
      case "response.text.done":
        // Text response
        this.emit("content", {
          type: "text",
          text: message.text || message.delta
        });
        break;
        
      case "response.done":
        // Turn complete
        this.emit("turncomplete");
        break;
        
      case "response.cancelled":
        // Response interrupted
        this.emit("interrupted");
        break;
        
      case "error":
        // Error from server
        this.emit("error", new Error(message.error?.message || "Unknown error"));
        break;
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

  sendAudio(audioData: ArrayBuffer) {
    if (this.connectionType === 'webrtc') {
      // WebRTC handles audio through media tracks, not data channel
      console.warn("Audio is handled through media tracks in WebRTC mode");
      return;
    }
    
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.send({
        type: "input_audio_buffer.append",
        audio: this.arrayBufferToBase64(audioData)
      });
    }
  }

  sendText(text: string) {
    this.send({
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [
          {
            type: "input_text",
            text: text
          }
        ]
      }
    });
    
    // Trigger response generation
    this.send({
      type: "response.create"
    });
  }

  send(data: any) {
    const jsonData = JSON.stringify(data);
    
    if (this.connectionType === 'webrtc' && this.dc && this.dc.readyState === 'open') {
      this.dc.send(jsonData);
    } else if (this.connectionType === 'websocket' && this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(jsonData);
    }
  }

  disconnect() {
    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }
    
    if (this.dc) {
      this.dc.close();
      this.dc = null;
    }
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.srcObject = null;
      this.audioElement = null;
    }
    
    this._status = "disconnected";
    return true;
  }
}
