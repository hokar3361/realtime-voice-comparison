# 🎙️ リアルタイム音声対話アプリ

Gemini LiveとOpenAI Realtimeの両方を試せるWebアプリケーションです。リアルタイムな音声対話と、テキストチャットの両方に対応しています。

## ✨ 機能

- **Gemini Live (2.0 Flash)** - Googleの最新リアルタイム音声対話API
- **OpenAI Realtime (GPT)** - OpenAIの最新リアルタイム音声対話API  
- 🎤 リアルタイム音声入力・出力
- 💬 テキストチャット機能
- 🔄 モデル切り替え機能
- 🎨 美しいモダンなUI

## 🚀 セットアップ

### 1. 必要なAPIキーの取得

#### Gemini API Key
1. [Google AI Studio](https://makersuite.google.com/app/apikey)にアクセス
2. 「Get API Key」をクリックしてAPIキーを生成

#### OpenAI API Key  
1. [OpenAI Platform](https://platform.openai.com/api-keys)にアクセス
2. 「Create new secret key」をクリックしてAPIキーを生成

### 2. 環境変数の設定

```bash
# env.exampleをコピーして.envファイルを作成
cp env.example .env
```

`.env`ファイルを編集して、取得したAPIキーを設定：

```env
REACT_APP_GEMINI_API_KEY=your_gemini_api_key_here
REACT_APP_OPENAI_API_KEY=your_openai_api_key_here
```

### 3. 依存関係のインストール

```bash
npm install
```

### 4. アプリケーションの起動

```bash
npm start
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開きます。

## 📱 使い方

1. **モデル選択**: ドロップダウンメニューから使用したいモデル（Gemini LiveまたはOpenAI Realtime）を選択

2. **接続**: 「接続」ボタンをクリックしてAPIに接続

3. **音声対話**: 
   - 「🎤 録音開始」ボタンをクリックして音声入力を開始
   - 話し終わったら「⏹️ 録音停止」をクリック
   - AIからの音声応答が自動的に再生されます

4. **テキストチャット**: 
   - テキスト入力欄にメッセージを入力
   - Enterキーまたは「送信」ボタンでメッセージを送信

5. **切断**: 「切断」ボタンでセッションを終了

## 🛠️ 技術スタック

- **React** - UIフレームワーク
- **TypeScript** - 型安全な開発
- **@google/genai** - Gemini Live API クライアント
- **WebSocket** - OpenAI Realtime API通信
- **Web Audio API** - 音声処理

## 📝 注意事項

- マイクへのアクセス許可が必要です
- HTTPSまたはlocalhostでの実行が必要です
- APIキーは安全に管理してください（本番環境では環境変数を使用）

## 🔧 トラブルシューティング

### 接続できない場合
- APIキーが正しく設定されているか確認
- ブラウザのコンソールでエラーメッセージを確認

### 音声が聞こえない場合
- ブラウザの音声許可設定を確認
- システムの音量設定を確認

### マイクが使えない場合
- ブラウザにマイクへのアクセス許可を与える
- 他のアプリケーションがマイクを使用していないか確認

## 📄 ライセンス

MIT

## 🤝 貢献

プルリクエストを歓迎します！大きな変更の場合は、まずissueを開いて変更内容について議論してください。