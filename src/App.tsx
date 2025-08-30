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

import { useRef, useState } from "react";
import "./App.scss";
import { LiveAPIProvider } from "./contexts/LiveAPIContext";
import SidePanel from "./components/side-panel/SidePanel";
import { Altair } from "./components/altair/Altair";
import ControlTray from "./components/control-tray/ControlTray";
import SettingsPanel from "./components/settings-panel/SettingsPanel";
import cn from "classnames";
import { UnifiedLiveClientOptions } from "./types";

// Environment variables with fallbacks
const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY || "your-gemini-api-key-here";
const OPENAI_API_KEY = process.env.REACT_APP_OPENAI_API_KEY || "your-openai-api-key-here";
const DEFAULT_PROVIDER = (process.env.REACT_APP_DEFAULT_PROVIDER as 'gemini' | 'openai') || 'gemini';

// Warn if API keys are not set
if (GEMINI_API_KEY === "your-gemini-api-key-here") {
  console.warn("REACT_APP_GEMINI_API_KEY not set in environment variables");
}
if (OPENAI_API_KEY === "your-openai-api-key-here") {
  console.warn("REACT_APP_OPENAI_API_KEY not set in environment variables");
}

const apiOptions: UnifiedLiveClientOptions = {
  provider: DEFAULT_PROVIDER,
  gemini: {
    apiKey: GEMINI_API_KEY,
  },
  openai: {
    apiKey: OPENAI_API_KEY,
    connectionType: (process.env.REACT_APP_OPENAI_CONNECTION_TYPE as 'webrtc' | 'websocket') || 'webrtc',
  },
};

function App() {
  // this video reference is used for displaying the active stream, whether that is the webcam or screen capture
  // feel free to style as you see fit
  const videoRef = useRef<HTMLVideoElement>(null);
  // either the screen capture, the video or null, if null we hide it
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);

  return (
    <div className="App">
      <LiveAPIProvider options={apiOptions}>
        <SettingsPanel />
        <div className="streaming-console">
          <SidePanel />
          <main>
            <div className="main-app-area">
              {/* APP goes here */}
              <Altair />
              <video
                className={cn("stream", {
                  hidden: !videoRef.current || !videoStream,
                })}
                ref={videoRef}
                autoPlay
                playsInline
              />
            </div>

            <ControlTray
              videoRef={videoRef}
              supportsVideo={true}
              onVideoStreamChange={setVideoStream}
              enableEditingSettings={false}
            >
              {/* put your own buttons here */}
            </ControlTray>
          </main>
        </div>
      </LiveAPIProvider>
    </div>
  );
}

export default App;
