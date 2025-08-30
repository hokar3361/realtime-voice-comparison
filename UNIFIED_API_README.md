# Unified Live API Console

このアプリケーションは、Google Gemini LiveとOpenAI Realtime APIの両方をサポートする統合コンソールです。

## 設定

### 環境変数

以下の環境変数を設定してください：

```bash
# Gemini API設定
REACT_APP_GEMINI_API_KEY=your-gemini-api-key-here

# OpenAI API設定  
REACT_APP_OPENAI_API_KEY=your-openai-api-key-here

# デフォルトプロバイダー (gemini または openai)
REACT_APP_DEFAULT_PROVIDER=gemini

# OpenAI接続タイプ (webrtc または websocket)
REACT_APP_OPENAI_CONNECTION_TYPE=webrtc

# Geminiモデル
REACT_APP_GEMINI_MODEL=models/gemini-2.0-flash-exp

# OpenAIモデル
REACT_APP_OPENAI_MODEL=gpt-4o-realtime-preview-2024-10-01
```

### .envファイルの作成

プロジェクトルートに`.env`ファイルを作成し、上記の環境変数を設定してください：

```bash
# .env
REACT_APP_GEMINI_API_KEY=your-actual-gemini-api-key
REACT_APP_OPENAI_API_KEY=your-actual-openai-api-key
REACT_APP_DEFAULT_PROVIDER=gemini
```

## 使用方法

### プロバイダーの切り替え

1. 設定アイコン（⚙️）をクリック
2. "AI Provider"ドロップダウンから選択
3. 接続前にプロバイダーを変更可能

### 各プロバイダーの特徴

#### Google Gemini Live
- 高品質な音声対話
- マルチモーダル対応（テキスト、音声、画像）
- 関数呼び出しサポート
- WebRTC接続

#### OpenAI Realtime
- 低遅延音声対話
- WebRTCまたはWebSocket接続
- 複数の音声設定
- リアルタイム応答

## API機能

### 共通機能
- 音声入力/出力
- テキスト対話
- 接続状態管理
- エラーハンドリング

### Gemini固有機能
- 関数呼び出し
- マルチモーダル入力
- システム指示設定

### OpenAI固有機能
- 音声設定の細かな制御
- WebRTC/WebSocket選択
- 低遅延モード

## 開発

### アーキテクチャ

```
src/
├── lib/
│   ├── genai-live-client.ts      # Gemini Live クライアント
│   ├── openai-realtime-client.ts # OpenAI Realtime クライアント
│   └── unified-live-client.ts    # 統合クライアント
├── hooks/
│   └── use-live-api.ts           # React フック
├── contexts/
│   └── LiveAPIContext.tsx       # React コンテキスト
└── components/
    └── settings-dialog/
        ├── ProviderSelector.tsx  # プロバイダー選択
        └── SettingsDialog.tsx   # 設定ダイアログ
```

### 統合クライアント

`UnifiedLiveClient`は両方のプロバイダーを統一されたインターフェースで管理します：

```typescript
const client = new UnifiedLiveClient({
  provider: 'gemini', // または 'openai'
  gemini: { apiKey: 'your-gemini-key' },
  openai: { 
    apiKey: 'your-openai-key',
    connectionType: 'webrtc' 
  }
});

// プロバイダー切り替え
await client.switchProvider('openai');
```

## トラブルシューティング

### よくある問題

1. **APIキーエラー**
   - 環境変数が正しく設定されているか確認
   - APIキーの有効性を確認

2. **音声が聞こえない**
   - ブラウザの音声権限を確認
   - マイク/スピーカーの設定を確認

3. **接続エラー**
   - ネットワーク接続を確認
   - HTTPS環境で実行されているか確認（WebRTCに必要）

### デバッグ

開発者ツールのコンソールでログを確認してください：

```javascript
// プロバイダー状態確認
console.log(client.currentProvider);
console.log(client.status);

// イベントリスナー追加
client.on('error', (error) => {
  console.error('Client error:', error);
});
```
