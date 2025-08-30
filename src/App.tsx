import React, { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';
import { GeminiClient } from './lib/gemini-client';
import { OpenAIRealtimeClient, ConnectionType } from './lib/openai-realtime-client';
import { AudioStreamer, AudioRecorder } from './lib/audio-utils';
import { Modality } from '@google/genai';

type ModelType = 'gemini' | 'openai';

// Gemini voices
const GEMINI_VOICES = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Aoede', 'Leda', 'Orus', 'Zephyr'];

// OpenAI voices  
const OPENAI_VOICES = ['marin', 'cedar'];

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

function App() {
  const [selectedModel, setSelectedModel] = useState<ModelType>('gemini');
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState('切断中');
  const [geminiVoice, setGeminiVoice] = useState('Aoede');
  const [openaiVoice, setOpenaiVoice] = useState('marin');
  const [logs, setLogs] = useState<string[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  
  const geminiClientRef = useRef<GeminiClient | null>(null);
  const openaiClientRef = useRef<OpenAIRealtimeClient | null>(null);
  const audioStreamerRef = useRef<AudioStreamer | null>(null);
  const audioRecorderRef = useRef<AudioRecorder | null>(null);
  const audioChunkBufferRef = useRef<ArrayBuffer[]>([]);
  const sendIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
    console.log(`[${timestamp}] ${message}`);
  }, []);

  useEffect(() => {
    // Initialize audio streamer
    audioStreamerRef.current = new AudioStreamer();
    audioRecorderRef.current = new AudioRecorder();
    addLog('Audio components initialized');

    // Initialize clients with API keys from environment variables
    const geminiApiKey = process.env.REACT_APP_GEMINI_API_KEY;
    const openaiApiKey = process.env.REACT_APP_OPENAI_API_KEY;

    if (geminiApiKey) {
      geminiClientRef.current = new GeminiClient(geminiApiKey);
      addLog('Gemini client initialized');
    } else {
      addLog('Warning: Gemini API key not found');
    }

    if (openaiApiKey) {
      // Always use WebRTC for OpenAI
      openaiClientRef.current = new OpenAIRealtimeClient(openaiApiKey, 'webrtc');
      addLog('OpenAI client initialized');
    } else {
      addLog('Warning: OpenAI API key not found');
    }

    return () => {
      // Cleanup on unmount
      if (sendIntervalRef.current) {
        clearInterval(sendIntervalRef.current);
      }
      geminiClientRef.current?.disconnect();
      openaiClientRef.current?.disconnect();
      audioStreamerRef.current?.stop();
      audioRecorderRef.current?.stop();
    };
  }, [addLog]);

  const setupGeminiHandlers = useCallback(() => {
    const client = geminiClientRef.current;
    if (!client) return;

    // Remove existing listeners first
    client.removeAllListeners();

    client.on('open', () => {
      setStatus('Gemini Live 接続済み');
      setIsConnected(true);
      addLog('Gemini Live connected');
    });

    client.on('close', () => {
      setStatus('Gemini Live 切断');
      setIsConnected(false);
      addLog('Gemini Live disconnected');
    });

    client.on('audio', (data) => {
      audioStreamerRef.current?.addPCM16(new Uint8Array(data));
      addLog(`Received audio: ${data.byteLength} bytes`);
    });

    client.on('content', (data) => {
      if (data.modelTurn?.parts) {
        const textParts = data.modelTurn.parts.filter((p: any) => p.text);
        if (textParts.length > 0) {
          const text = textParts.map((p: any) => p.text).join(' ');
          addMessage('assistant', text);
          addLog('Received text response');
        }
      }
    });

    client.on('error', (error) => {
      console.error('Gemini error:', error);
      setStatus('エラーが発生しました');
      addLog(`Gemini error: ${error}`);
    });

    client.on('log', (message) => {
      addLog(`[Gemini] ${message}`);
    });
  }, [addLog]);

  const setupOpenAIHandlers = useCallback(() => {
    const client = openaiClientRef.current;
    if (!client) return;

    // Remove existing listeners first
    client.removeAllListeners();

    client.on('open', () => {
      setStatus('OpenAI Realtime 接続済み');
      setIsConnected(true);
      addLog('OpenAI Realtime connected');
    });

    client.on('close', () => {
      setStatus('OpenAI Realtime 切断');
      setIsConnected(false);
      addLog('OpenAI Realtime disconnected');
    });

    client.on('audio', (data) => {
      audioStreamerRef.current?.addPCM16(new Uint8Array(data));
      addLog(`Received audio: ${data.byteLength} bytes`);
    });

    client.on('content', (data) => {
      if (data.type === 'text' && data.text) {
        addMessage('assistant', data.text);
        addLog('Received text response');
      }
    });

    client.on('error', (error) => {
      console.error('OpenAI error:', error);
      setStatus('エラーが発生しました');
      addLog(`OpenAI error: ${error}`);
    });
  }, [addLog]);

  const addMessage = (role: 'user' | 'assistant' | 'system', content: string) => {
    setMessages(prev => [...prev, {
      role,
      content,
      timestamp: new Date()
    }]);
  };

  const connect = async () => {
    setStatus('接続中...');
    addLog(`Connecting to ${selectedModel}...`);
    
    try {
      if (selectedModel === 'gemini') {
        const client = geminiClientRef.current;
        if (!client) {
          alert('Gemini APIキーが設定されていません。環境変数を確認してください。');
          return;
        }
        
        const config = {
          systemInstruction: {
            parts: [
              {
                text: "あなたは親切で役立つアシスタントです。ユーザーと同じ言語で応答してください。"
              }
            ]
          },
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { 
              prebuiltVoiceConfig: { 
                voiceName: geminiVoice 
              } 
            }
          }
        };
        
        setupGeminiHandlers();
        await client.connect("gemini-2.5-flash-preview-native-audio-dialog", config as any);
        addLog('Gemini connection successful');
      } else {
        // OpenAI (always WebRTC)
        const openaiApiKey = process.env.REACT_APP_OPENAI_API_KEY;
        if (!openaiApiKey) {
          alert('OpenAI APIキーが設定されていません。環境変数を確認してください。');
          return;
        }

        openaiClientRef.current = new OpenAIRealtimeClient(openaiApiKey, 'webrtc');
        setupOpenAIHandlers();
        
        const config = {
          instructions: "あなたは親切で役立つアシスタントです。ユーザーと同じ言語で応答してください。",
          voice: openaiVoice
        };
        
        await openaiClientRef.current.connect("gpt-realtime", config);
        addLog('OpenAI connection successful');
      }
    } catch (error) {
      console.error('Connection error:', error);
      setStatus('接続エラー');
      setIsConnected(false);
      addLog(`Connection error: ${error}`);
    }
  };

  const disconnect = () => {
    if (sendIntervalRef.current) {
      clearInterval(sendIntervalRef.current);
      sendIntervalRef.current = null;
    }
    
    if (selectedModel === 'gemini') {
      geminiClientRef.current?.disconnect();
    } else {
      openaiClientRef.current?.disconnect();
    }
    
    audioStreamerRef.current?.stop();
    if (audioRecorderRef.current?.isRecording()) {
      audioRecorderRef.current.stop();
    }
    
    setIsConnected(false);
    setIsRecording(false);
    setStatus('切断中');
    addLog('Disconnected');
  };

  const startRecording = async () => {
    if (!isConnected) {
      alert('先に接続してください');
      return;
    }

    try {
      addLog('Starting recording...');
      
      // Clear buffer
      audioChunkBufferRef.current = [];
      
      // For Gemini, we need to batch and send audio chunks periodically
      if (selectedModel === 'gemini') {
        // Start interval to send buffered audio
        sendIntervalRef.current = setInterval(() => {
          if (audioChunkBufferRef.current.length > 0) {
            const chunks = audioChunkBufferRef.current.map(buffer => ({
              // Explicit 16kHz per Gemini sample
              mimeType: 'audio/pcm;rate=16000',
              data: arrayBufferToBase64(buffer)
            }));
            
            geminiClientRef.current?.sendRealtimeInput(chunks);
            addLog(`Sent ${chunks.length} audio chunks to Gemini`);
            audioChunkBufferRef.current = [];
          }
        }, 100); // Send every 100ms
      }

      await audioRecorderRef.current?.start((audioData) => {
        if (selectedModel === 'gemini') {
          // Send immediately as Blob (sample parity)
          const blob = new Blob([audioData], { type: 'audio/pcm;rate=16000' });
          geminiClientRef.current?.sendRealtimeInput([blob]);
        } else {
          // OpenAI can handle streaming
          openaiClientRef.current?.sendAudio(audioData);
        }
      });
      
      setIsRecording(true);
      addMessage('user', '[音声入力中...]');
      addLog('Recording started');
    } catch (error) {
      console.error('Recording error:', error);
      alert('マイクへのアクセスが拒否されました');
      addLog(`Recording error: ${error}`);
    }
  };

  const stopRecording = () => {
    if (sendIntervalRef.current) {
      clearInterval(sendIntervalRef.current);
      sendIntervalRef.current = null;
      
      // Send any remaining buffered audio
      if (selectedModel === 'gemini' && audioChunkBufferRef.current.length > 0) {
        const chunks = audioChunkBufferRef.current.map(buffer => ({
          mimeType: 'audio/pcm;rate=16000',
          data: arrayBufferToBase64(buffer)
        }));
        
        geminiClientRef.current?.sendRealtimeInput(chunks);
        addLog(`Sent final ${chunks.length} audio chunks to Gemini`);
        audioChunkBufferRef.current = [];
        // signal end of turn so the model can respond
        geminiClientRef.current?.endTurn();
        addLog('Sent turnComplete to Gemini');
      }
    }
    
    audioRecorderRef.current?.stop();
    setIsRecording(false);
    addLog('Recording stopped');
  };

  const sendTextMessage = () => {
    const input = document.getElementById('text-input') as HTMLInputElement;
    if (!input || !input.value.trim()) return;
    
    const message = input.value.trim();
    addMessage('user', message);
    addLog(`Sending text: ${message}`);
    
    if (selectedModel === 'gemini') {
      geminiClientRef.current?.send({ text: message });
    } else {
      openaiClientRef.current?.sendText(message);
    }
    
    input.value = '';
  };

  const clearLogs = () => {
    setLogs([]);
  };

  // Auto-start recording for Gemini after connect
  useEffect(() => {
    if (isConnected && selectedModel === 'gemini' && !isRecording) {
      // kick off capture automatically for Gemini
      startRecording();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, selectedModel]);

  return (
    <div className="App">
      <header className="App-header">
        <h1>🎙️ リアルタイム音声対話</h1>
        <p className="subtitle">Gemini Live & OpenAI Realtime</p>
      </header>

      <div className="container">
        <div className="control-panel">
          <div className="model-selector">
            <label>モデル選択:</label>
            <select 
              value={selectedModel} 
              onChange={(e) => setSelectedModel(e.target.value as ModelType)}
              disabled={isConnected}
            >
              <option value="gemini">Gemini Live (2.5 native audio dialog)</option>
              <option value="openai">OpenAI Realtime (WebRTC)</option>
            </select>
          </div>

          {selectedModel === 'gemini' && (
            <div className="voice-selector">
              <label>Gemini Voice:</label>
              <select 
                value={geminiVoice} 
                onChange={(e) => setGeminiVoice(e.target.value)}
                disabled={isConnected}
              >
                {GEMINI_VOICES.map(voice => (
                  <option key={voice} value={voice}>{voice}</option>
                ))}
              </select>
            </div>
          )}

          {selectedModel === 'openai' && (
            <div className="voice-selector">
              <label>OpenAI Voice:</label>
              <select 
                value={openaiVoice} 
                onChange={(e) => setOpenaiVoice(e.target.value)}
                disabled={isConnected}
              >
                {OPENAI_VOICES.map(voice => (
                  <option key={voice} value={voice}>{voice}</option>
                ))}
              </select>
            </div>
          )}

          <div className="connection-controls">
            {!isConnected ? (
              <button className="connect-btn" onClick={connect}>
                接続
              </button>
            ) : (
              <button className="disconnect-btn" onClick={disconnect}>
                切断
              </button>
            )}
            <span className={`status ${isConnected ? 'connected' : 'disconnected'}`}>
              {status}
            </span>
          </div>

          <div className="audio-controls">
            <button 
              className={`record-btn ${isRecording ? 'recording' : ''}`}
              onClick={isRecording ? stopRecording : startRecording}
              disabled={!isConnected}
            >
              {isRecording ? '⏹️ 録音停止' : '🎤 録音開始'}
            </button>
            {isRecording && (
              <span className="recording-indicator">● 録音中...</span>
            )}
          </div>

          <div className="text-input-container">
            <input
              id="text-input"
              type="text"
              placeholder="メッセージを入力..."
              disabled={!isConnected}
              onKeyPress={(e) => e.key === 'Enter' && sendTextMessage()}
            />
            <button onClick={sendTextMessage} disabled={!isConnected}>
              送信
            </button>
          </div>

          <div className="log-controls">
            <button onClick={() => setShowLogs(!showLogs)}>
              {showLogs ? 'ログを隠す' : 'ログを表示'}
            </button>
            {showLogs && (
              <button onClick={clearLogs}>ログをクリア</button>
            )}
          </div>
        </div>

        <div className="chat-container">
          <div className="messages">
            {messages.map((msg, index) => (
              <div key={index} className={`message ${msg.role}`}>
                <div className="message-header">
                  <span className="role">
                    {msg.role === 'user' ? 'あなた' : msg.role === 'assistant' ? 'AI' : 'システム'}
                  </span>
                  <span className="timestamp">
                    {msg.timestamp.toLocaleTimeString()}
                  </span>
                </div>
                <div className="message-content">{msg.content}</div>
              </div>
            ))}
          </div>

          {showLogs && (
            <div className="logs">
              <h3>デバッグログ</h3>
              <div className="log-content">
                {logs.map((log, index) => (
                  <div key={index} className="log-entry">{log}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper function
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export default App;