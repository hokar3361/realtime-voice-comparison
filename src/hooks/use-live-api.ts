/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { UnifiedLiveClient } from "../lib/unified-live-client";
import { UnifiedLiveClientOptions, Provider } from "../types";
import { AudioStreamer } from "../lib/audio-streamer";
import { audioContext } from "../lib/utils";
import VolMeterWorket from "../lib/worklets/vol-meter";
import { soundEffects } from "../lib/sound-effects";

export type UseLiveAPIResults = {
  client: UnifiedLiveClient;
  setConfig: (config: any) => void;
  config: any;
  model: string;
  setModel: (model: string) => void;
  connected: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  volume: number;
  provider: Provider;
  setProvider: (provider: Provider) => void;
  switchProvider: (provider: Provider) => Promise<void>;
};

export function useLiveAPI(options: UnifiedLiveClientOptions): UseLiveAPIResults {
  const client = useMemo(() => new UnifiedLiveClient(options), [options]);
  const audioStreamerRef = useRef<AudioStreamer | null>(null);

  const [model, setModel] = useState<string>(
    options.provider === 'gemini' 
      ? "models/gemini-2.5-flash-preview-native-audio-dialog" 
      : "gpt-realtime"
  );
  const [config, setConfig] = useState<any>({});
  const [connected, setConnected] = useState(false);
  const [volume, setVolume] = useState(0);
  const [provider, setProvider] = useState<Provider>(options.provider);

  // register audio for streaming server -> speakers
  useEffect(() => {
    if (!audioStreamerRef.current) {
      audioContext({ id: "audio-out" }).then((audioCtx: AudioContext) => {
        audioStreamerRef.current = new AudioStreamer(audioCtx);
        audioStreamerRef.current
          .addWorklet<any>("vumeter-out", VolMeterWorket, (ev: any) => {
            setVolume(ev.data.volume);
          })
          .then(() => {
            // Successfully added worklet
          });
      });
    }
  }, [audioStreamerRef]);

  useEffect(() => {
    const onOpen = () => {
      setConnected(true);
      // Play connection success sound
      soundEffects.playConnectSuccess();
    };

    const onClose = () => {
      setConnected(false);
      // Play disconnect sound
      soundEffects.play('disconnect');
    };

    const onError = (error: any) => {
      console.error("error", error);
      // Play error sound
      soundEffects.playError();
    };

    const stopAudioStreamer = () => audioStreamerRef.current?.stop();

    const onAudio = (data: ArrayBuffer) =>
      audioStreamerRef.current?.addPCM16(new Uint8Array(data));

    const onProviderChanged = (newProvider: Provider) => {
      setProvider(newProvider);
      // Update model when provider changes
      const defaultModel = newProvider === 'gemini' 
        ? "models/gemini-2.5-flash-preview-native-audio-dialog" 
        : "gpt-realtime";
      setModel(defaultModel);
    };

    // Setup complete handler (Gemini specific)
    const onSetupComplete = () => {
      console.log("Setup complete - ready to chat!");
      soundEffects.playReady();
    };

    client
      .on("error", onError)
      .on("open", onOpen)
      .on("close", onClose)
      .on("interrupted", stopAudioStreamer)
      .on("audio", onAudio)
      .on("setupcomplete", onSetupComplete)
      .on("providerChanged", onProviderChanged);

    return () => {
      client
        .off("error", onError)
        .off("open", onOpen)
        .off("close", onClose)
        .off("interrupted", stopAudioStreamer)
        .off("audio", onAudio)
        .off("setupcomplete", onSetupComplete)
        .off("providerChanged", onProviderChanged)
        .disconnect();
    };
  }, [client]);

  const connect = useCallback(async () => {
    if (!config) {
      throw new Error("config has not been set");
    }
    client.disconnect();
    await client.connect(model, config);
  }, [client, config, model]);

  const disconnect = useCallback(async () => {
    client.disconnect();
    setConnected(false);
  }, [setConnected, client]);

  const switchProvider = useCallback(async (newProvider: Provider) => {
    await client.switchProvider(newProvider);
  }, [client]);

  return {
    client,
    config,
    setConfig,
    model,
    setModel,
    connected,
    connect,
    disconnect,
    volume,
    provider,
    setProvider,
    switchProvider,
  };
}