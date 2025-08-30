/**
 * Settings Panel - Always visible settings at the top of the console
 */

import { useCallback, useEffect, useState } from "react";
import { useLiveAPIContext } from "../../contexts/LiveAPIContext";
import { Provider } from "../../types";
import { soundEffects } from "../../lib/sound-effects";
import "./settings-panel.scss";

// Voice options for each provider
const GEMINI_VOICES = [
  { value: "Zephyr", label: "Zephyr" },
  { value: "Puck", label: "Puck" },
  { value: "Charon", label: "Charon" },
  { value: "Kore", label: "Kore" },
  { value: "Fenrir", label: "Fenrir" },
  { value: "Aoede", label: "Aoede" },
  { value: "Leda", label: "Leda" },
  { value: "Orus", label: "Orus" },
];

const OPENAI_VOICES = [
  { value: "marin", label: "Marin" },
  { value: "cedar", label: "Cedar" },
];

export default function SettingsPanel() {
  const { 
    provider, 
    switchProvider, 
    connected, 
    config, 
    setConfig,
    model,
    setModel 
  } = useLiveAPIContext();

  const [soundEnabled, setSoundEnabled] = useState(soundEffects.isEnabled());

  // プロバイダー変更時にデフォルト設定を適用
  useEffect(() => {
    if (!connected) {
      if (provider === 'gemini') {
        // Gemini用のデフォルト設定
        if (!config?.speechConfig?.voiceConfig?.prebuiltVoiceConfig?.voiceName) {
          setConfig({
            ...config,
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: 'Zephyr',
                },
              },
            },
            systemInstruction: config?.systemInstruction || 'You are a helpful assistant.'
          });
        }
      } else {
        // OpenAI用のデフォルト設定
        if (!config?.voice) {
          setConfig({
            ...config,
            voice: 'marin',
            instructions: config?.instructions || 'You are a helpful assistant.'
          });
        }
      }
    }
  }, [provider, connected, config, setConfig]);

  const handleProviderChange = useCallback(
    async (event: React.ChangeEvent<HTMLSelectElement>) => {
      const newProvider = event.target.value as Provider;
      if (newProvider !== provider && !connected) {
        // プロバイダー変更時に適切なデフォルト設定を適用
        const newConfig = newProvider === 'gemini' 
          ? {
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: 'Zephyr',
                  },
                },
              },
              systemInstruction: 'You are a helpful assistant.'
            }
          : {
              voice: 'marin',
              instructions: 'You are a helpful assistant.'
            };
        
        setConfig(newConfig);
        await switchProvider(newProvider);
      }
    },
    [provider, switchProvider, connected, setConfig]
  );

  const handleVoiceChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const voice = event.target.value;
      console.log(`Voice changed to: ${voice} for provider: ${provider}`);
      
      if (provider === 'gemini') {
        const newConfig = {
          ...config,
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: voice,
              },
            },
          },
        };
        console.log('Setting Gemini config:', newConfig);
        setConfig(newConfig);
      } else {
        const newConfig = {
          ...config,
          voice: voice
        };
        console.log('Setting OpenAI config:', newConfig);
        setConfig(newConfig);
      }
    },
    [config, setConfig, provider]
  );

  const handleModelChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      setModel(event.target.value);
    },
    [setModel]
  );

  const handleSystemInstructionChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (provider === 'gemini') {
        setConfig({
          ...config,
          systemInstruction: event.target.value
        });
      } else {
        setConfig({
          ...config,
          instructions: event.target.value
        });
      }
    },
    [config, setConfig, provider]
  );

  const handleSoundToggle = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const enabled = event.target.checked;
      setSoundEnabled(enabled);
      soundEffects.setEnabled(enabled);
      
      // Play a test sound when enabling
      if (enabled) {
        soundEffects.playBeep(800, 100, 0.2);
      }
    },
    []
  );

  const currentVoices = provider === 'gemini' ? GEMINI_VOICES : OPENAI_VOICES;
  const currentVoice = provider === 'gemini' 
    ? config?.speechConfig?.voiceConfig?.prebuiltVoiceConfig?.voiceName || 'Zephyr'
    : config?.voice || 'marin';

  const systemInstruction = provider === 'gemini' 
    ? (typeof config?.systemInstruction === 'string' ? config.systemInstruction : '')
    : (config?.instructions || '');

  return (
    <div className="settings-panel">
      <div className="settings-header">
        <h2>Live API Settings</h2>
        {connected && (
          <span className="connection-status connected">
            Connected to {provider === 'gemini' ? 'Gemini Live' : 'OpenAI Realtime'}
          </span>
        )}
      </div>

      <div className="settings-grid">
        <div className="setting-group">
          <label>Provider</label>
          <select 
            value={provider} 
            onChange={handleProviderChange}
            disabled={connected}
          >
            <option value="gemini">Google Gemini Live</option>
            <option value="openai">OpenAI Realtime</option>
          </select>
        </div>

        <div className="setting-group">
          <label>Model</label>
          <select 
            value={model} 
            onChange={handleModelChange}
            disabled={connected}
          >
            {provider === 'gemini' ? (
              <>
                <option value="models/gemini-2.5-flash-preview-native-audio-dialog">Gemini 2.5 Flash Preview Native Audio Dialog</option>
              </>
            ) : (
              <>
                <option value="gpt-realtime">GPT Realtime )</option>
              </>
            )}
          </select>
        </div>

        <div className="setting-group">
          <label>Voice</label>
          <select 
            key={`voice-${provider}`}
            value={currentVoice} 
            onChange={handleVoiceChange}
            disabled={connected}
          >
            {currentVoices.map(voice => (
              <option key={voice.value} value={voice.value}>
                {voice.label}
              </option>
            ))}
          </select>
        </div>

        {provider === 'openai' && (
          <div className="setting-group">
            <label>Connection Type</label>
            <select disabled={connected}>
              <option value="webrtc">WebRTC (Recommended)</option>
              <option value="websocket">WebSocket</option>
            </select>
          </div>
        )}

        <div className="setting-group">
          <label>Sound Effects</label>
          <div className="sound-toggle">
            <input
              type="checkbox"
              id="sound-enabled"
              checked={soundEnabled}
              onChange={handleSoundToggle}
            />
            <label htmlFor="sound-enabled">
              {soundEnabled ? '🔊 Enabled' : '🔇 Disabled'}
            </label>
          </div>
        </div>
      </div>

      <div className="system-instruction-group">
        <label>
          {provider === 'gemini' ? 'System Instructions' : 'Instructions'}
        </label>
        <textarea
          key={`instruction-${provider}`}
          value={systemInstruction}
          onChange={handleSystemInstructionChange}
          placeholder={provider === 'gemini' 
            ? "Enter system instructions for Gemini..."
            : "Enter instructions for OpenAI..."
          }
          disabled={connected}
          rows={3}
        />
      </div>

      {connected && (
        <div className="connection-note">
          Disconnect to change settings
        </div>
      )}
    </div>
  );
}
