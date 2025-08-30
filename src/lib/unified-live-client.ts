/**
 * Unified Live API Client
 * Provides a common interface for both Gemini Live and OpenAI Realtime APIs
 */

import { EventEmitter } from "eventemitter3";
import { GenAILiveClient } from "./genai-live-client";
import { OpenAIRealtimeClient, ConnectionType } from "./openai-realtime-client";
import { LiveClientOptions } from "../types";
import { LiveConnectConfig } from "@google/genai";

export type Provider = 'gemini' | 'openai';

export interface UnifiedLiveClientOptions {
  provider: Provider;
  gemini?: LiveClientOptions;
  openai?: {
    apiKey: string;
    connectionType?: ConnectionType;
  };
}

export interface UnifiedClientEventTypes {
  // Common events that both providers support
  audio: (data: ArrayBuffer) => void;
  close: (event?: CloseEvent) => void;
  content: (data: any) => void;
  error: (error: Error | ErrorEvent) => void;
  interrupted: () => void;
  open: () => void;
  turncomplete: () => void;
  
  // Gemini-specific events
  log?: (log: any) => void;
  setupcomplete?: () => void;
  toolcall?: (toolCall: any) => void;
  toolcallcancellation?: (cancellation: any) => void;
  
  // Unified events
  providerChanged: (provider: Provider) => void;
}

export class UnifiedLiveClient extends EventEmitter<UnifiedClientEventTypes> {
  private geminiClient: GenAILiveClient | null = null;
  private openaiClient: OpenAIRealtimeClient | null = null;
  private _currentProvider: Provider;
  private options: UnifiedLiveClientOptions;
  private _status: "connected" | "disconnected" | "connecting" = "disconnected";

  public get status() {
    return this._status;
  }

  public get currentProvider() {
    return this._currentProvider;
  }

  public get activeClient() {
    return this._currentProvider === 'gemini' ? this.geminiClient : this.openaiClient;
  }

  constructor(options: UnifiedLiveClientOptions) {
    super();
    this.options = options;
    this._currentProvider = options.provider;
    
    this.initializeClients();
  }

  private initializeClients() {
    // Initialize Gemini client if options are provided
    if (this.options.gemini) {
      this.geminiClient = new GenAILiveClient(this.options.gemini);
      this.setupGeminiEvents();
    }

    // Initialize OpenAI client if options are provided
    if (this.options.openai) {
      this.openaiClient = new OpenAIRealtimeClient(
        this.options.openai.apiKey,
        this.options.openai.connectionType || 'webrtc'
      );
      this.setupOpenAIEvents();
    }
  }

  private setupGeminiEvents() {
    if (!this.geminiClient) return;

    this.geminiClient.on('audio', (data) => this.emit('audio', data));
    this.geminiClient.on('close', (event) => {
      this._status = "disconnected";
      this.emit('close', event);
    });
    this.geminiClient.on('content', (data) => this.emit('content', data));
    this.geminiClient.on('error', (error) => this.emit('error', error));
    this.geminiClient.on('interrupted', () => this.emit('interrupted'));
    this.geminiClient.on('log', (log) => this.emit('log', log));
    this.geminiClient.on('open', () => {
      this._status = "connected";
      this.emit('open');
    });
    this.geminiClient.on('setupcomplete', () => this.emit('setupcomplete'));
    this.geminiClient.on('toolcall', (toolCall) => this.emit('toolcall', toolCall));
    this.geminiClient.on('toolcallcancellation', (cancellation) => this.emit('toolcallcancellation', cancellation));
    this.geminiClient.on('turncomplete', () => this.emit('turncomplete'));
  }

  private setupOpenAIEvents() {
    if (!this.openaiClient) return;

    this.openaiClient.on('audio', (data) => this.emit('audio', data));
    this.openaiClient.on('close', () => {
      this._status = "disconnected";
      this.emit('close');
    });
    this.openaiClient.on('content', (data) => this.emit('content', data));
    this.openaiClient.on('error', (error) => this.emit('error', error));
    this.openaiClient.on('interrupted', () => this.emit('interrupted'));
    this.openaiClient.on('open', () => {
      this._status = "connected";
      this.emit('open');
    });
    this.openaiClient.on('turncomplete', () => this.emit('turncomplete'));
  }

  async switchProvider(provider: Provider): Promise<void> {
    if (provider === this._currentProvider) {
      return;
    }

    // Disconnect current provider
    await this.disconnect();

    // Switch to new provider
    this._currentProvider = provider;
    this.emit('providerChanged', provider);
  }

  async connect(model: string, config: any = {}): Promise<boolean> {
    if (this._status === "connected" || this._status === "connecting") {
      return false;
    }

    this._status = "connecting";

    try {
      if (this._currentProvider === 'gemini') {
        if (!this.geminiClient) {
          throw new Error("Gemini client not initialized");
        }
        return await this.geminiClient.connect(model, config as LiveConnectConfig);
      } else {
        if (!this.openaiClient) {
          throw new Error("OpenAI client not initialized");
        }
        return await this.openaiClient.connect(model, config);
      }
    } catch (error) {
      this._status = "disconnected";
      throw error;
    }
  }

  disconnect(): boolean {
    const activeClient = this.activeClient;
    if (activeClient) {
      const result = activeClient.disconnect();
      if (result) {
        this._status = "disconnected";
      }
      return result;
    }
    return false;
  }

  // Gemini-specific methods
  sendRealtimeInput(chunks: Array<{ mimeType: string; data: string }>) {
    if (this._currentProvider === 'gemini' && this.geminiClient) {
      this.geminiClient.sendRealtimeInput(chunks);
    }
  }

  sendToolResponse(toolResponse: any) {
    if (this._currentProvider === 'gemini' && this.geminiClient) {
      this.geminiClient.sendToolResponse(toolResponse);
    }
  }

  send(parts: any, turnComplete: boolean = true) {
    if (this._currentProvider === 'gemini' && this.geminiClient) {
      this.geminiClient.send(parts, turnComplete);
    } else if (this._currentProvider === 'openai' && this.openaiClient) {
      this.openaiClient.send(parts);
    }
  }

  // OpenAI-specific methods
  sendAudio(audioData: ArrayBuffer) {
    if (this._currentProvider === 'openai' && this.openaiClient) {
      this.openaiClient.sendAudio(audioData);
    }
  }

  sendText(text: string) {
    if (this._currentProvider === 'openai' && this.openaiClient) {
      this.openaiClient.sendText(text);
    } else if (this._currentProvider === 'gemini' && this.geminiClient) {
      this.geminiClient.send({ text });
    }
  }

  // Getters for provider-specific properties
  getConfig() {
    if (this._currentProvider === 'gemini' && this.geminiClient) {
      return this.geminiClient.getConfig();
    }
    return {};
  }

  get model() {
    if (this._currentProvider === 'gemini' && this.geminiClient) {
      return this.geminiClient.model;
    }
    return null;
  }

  get session() {
    if (this._currentProvider === 'gemini' && this.geminiClient) {
      return this.geminiClient.session;
    }
    return null;
  }
}