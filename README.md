# 🎙️ 統合リアルタイム音声対話アプリ

Gemini LiveとOpenAI Realtime APIの両方を統合したWebアプリケーションです。リアルタイムな音声対話とテキストチャット、効果音システムを備えた多機能な対話プラットフォームです。

## 🙏 謝辞

このプロジェクトは、Googleの[**live-api-web-console**](https://github.com/google-gemini/live-api-web-console)をベースに開発されています。元プロジェクトの優れた設計とコードに深く感謝いたします。

## ✨ 主要機能

### 🤖 統合AI プロバイダー
- **Gemini Live (2.0 Flash)** - Googleの最新リアルタイム音声対話API
- **OpenAI Realtime (GPT-4o)** - OpenAIの最新リアルタイム音声対話API
- 🔄 プロバイダーの簡単切り替え

### 🎵 音声機能
- 🎤 リアルタイム音声入力・出力
- 🔊 効果音システム（接続・準備完了・エラー音など）
- 🎚️ 音量調整・効果音ON/OFF切り替え
- 🗣️ プロバイダー別音声選択
  - **Gemini**: Zephyr, Puck, Charon, Kore, Fenrir, Aoede, Leda, Orus
  - **OpenAI**: Marin, Cedar

### 💬 対話機能
- 💬 テキストチャット機能
- 🔄 リアルタイム音声会話
- 📝 システム指示カスタマイズ
- 🎨 美しいモダンなUI

### ⚙️ 設定機能
- 📊 常時表示の設定パネル
- 🎛️ プロバイダー別設定管理
- 🔧 接続タイプ選択（WebRTC/WebSocket）
- 📱 レスポンシブデザイン

## 🚀 セットアップ

### 1. 必要なAPIキーの取得

#### Gemini API Key
1. [Google AI Studio](https://makersuite.google.com/app/apikey)にアクセス
2. 「Get API Key」をクリックしてAPIキーを生成

#### OpenAI API Key  
1. [OpenAI Platform](https://platform.openai.com/api-keys)にアクセス
2. 「Create new secret key」をクリックしてAPIキーを生成

### 2. 環境変数の設定

プロジェクトルートに`.env`ファイルを作成：

```env
# API Keys
REACT_APP_GEMINI_API_KEY=your-gemini-api-key-here
REACT_APP_OPENAI_API_KEY=your-openai-api-key-here

# Default settings
REACT_APP_DEFAULT_PROVIDER=gemini
REACT_APP_OPENAI_CONNECTION_TYPE=webrtc
```

### 3. 効果音ファイルの配置（オプション）

`public/sounds/`フォルダに以下のファイルを配置：

```
public/sounds/
├── connect.mp3      # 接続成功音
├── disconnect.mp3   # 切断音
├── ready.wav        # 準備完了音
├── error.wav        # エラー音
└── notification.wav # 通知音
```

※ファイルがない場合は自動生成のビープ音が使用されます

### 4. 依存関係のインストール・起動

```bash
npm install
npm start
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開きます。

## 📱 使い方

### 基本的な流れ
1. **プロバイダー選択**: 設定パネルでGemini LiveまたはOpenAI Realtimeを選択
2. **音声・モデル設定**: 使用する音声とモデルを選択
3. **接続**: 「Connect」ボタンでAPIに接続
4. **対話開始**: 音声またはテキストで対話開始

### 音声対話
- 🎤 **音声入力**: マイクボタンで録音開始/停止
- 🔊 **音声出力**: AIからの音声応答が自動再生
- 🎵 **効果音**: 接続時・準備完了時に効果音再生

### テキストチャット
- 💬 **テキスト入力**: 入力欄にメッセージを入力
- ⌨️ **送信**: Enterキーまたは送信ボタンで送信

### 設定管理
- ⚙️ **常時表示**: 設定パネルが上部に常時表示
- 🔄 **即時反映**: 設定変更が即座にUIに反映
- 🔇 **効果音制御**: チェックボックスで効果音ON/OFF

## 🛠️ 技術スタック

### フロントエンド
- **React 18** - UIフレームワーク
- **TypeScript** - 型安全な開発
- **SCSS** - スタイリング

### AI プロバイダー統合
- **@google/genai** - Gemini Live API クライアント
- **WebSocket/WebRTC** - OpenAI Realtime API通信
- **統合クライアント** - 両プロバイダーの統一インターフェース

### 音声処理
- **Web Audio API** - 音声処理・効果音
- **AudioWorklet** - 低遅延音声処理
- **MediaDevices API** - マイク・スピーカー制御

## 📁 プロジェクト構造

```
src/
├── components/
│   ├── settings-panel/     # 設定パネル
│   ├── altair/            # メインUI
│   ├── control-tray/      # コントロール
│   └── side-panel/        # サイドパネル
├── lib/
│   ├── unified-live-client.ts    # 統合クライアント
│   ├── openai-realtime-client.ts # OpenAIクライアント
│   ├── genai-live-client.ts      # Geminiクライアント
│   └── sound-effects.ts          # 効果音システム
├── hooks/
│   └── use-live-api.ts     # メインフック
└── contexts/
    └── LiveAPIContext.tsx  # Reactコンテキスト
```

## 🔧 トラブルシューティング

### 接続エラー
- APIキーが正しく設定されているか確認
- ブラウザのコンソールでエラーメッセージを確認
- HTTPS環境で実行（WebRTCに必要）

### 音声問題
- ブラウザの音声許可設定を確認
- マイク・スピーカーのデバイス設定を確認
- 他のアプリケーションとの競合を確認

### 効果音が再生されない
- ブラウザのコンソールで効果音ログを確認
- `public/sounds/`フォルダのファイル配置を確認
- 設定パネルで効果音が有効になっているか確認

## 🎯 今後の予定

- [ ] 会話履歴の保存・管理
- [ ] カスタム効果音のアップロード機能
- [ ] 音声認識精度の向上
- [ ] マルチモーダル対応（画像・動画）
- [ ] プラグインシステム

## 📄 ライセンス

Apache 2.0 License - 元プロジェクトのライセンスを継承

## 🤝 貢献

プルリクエストやissueを歓迎します！

### 開発に参加するには
1. このリポジトリをフォーク
2. 機能ブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add amazing feature'`)
4. ブランチをプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

## 🙏 クレジット

- **元プロジェクト**: [google-gemini/live-api-web-console](https://github.com/google-gemini/live-api-web-console)
- **Google Gemini Live API**: [ai.google.dev/api/live](https://ai.google.dev/api/live)
- **OpenAI Realtime API**: [platform.openai.com/docs/guides/realtime](https://platform.openai.com/docs/guides/realtime)

---

**このプロジェクトは実験的なものであり、Google公式製品ではありません。**