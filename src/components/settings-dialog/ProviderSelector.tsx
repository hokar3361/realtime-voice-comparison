/**
 * Provider selection component for switching between Gemini and OpenAI
 */

import { useCallback } from "react";
import { useLiveAPIContext } from "../../contexts/LiveAPIContext";
import { Provider } from "../../types";

export default function ProviderSelector() {
  const { provider, switchProvider, connected } = useLiveAPIContext();

  const handleProviderChange = useCallback(
    async (event: React.ChangeEvent<HTMLSelectElement>) => {
      const newProvider = event.target.value as Provider;
      if (newProvider !== provider) {
        await switchProvider(newProvider);
      }
    },
    [provider, switchProvider]
  );

  return (
    <div className="provider-selector">
      <label htmlFor="provider-select">AI Provider:</label>
      <select
        id="provider-select"
        value={provider}
        onChange={handleProviderChange}
        disabled={connected}
      >
        <option value="gemini">Google Gemini Live</option>
        <option value="openai">OpenAI Realtime</option>
      </select>
      {connected && (
        <p className="provider-note">
          Disconnect to switch providers
        </p>
      )}
    </div>
  );
}
