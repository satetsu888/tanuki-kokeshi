# たぬきこけし - 日本語なぞなぞ暗号

[![Deploy to GitHub Pages](https://github.com/satetsu888/tanuki-kokeshi/actions/workflows/deploy.yml/badge.svg)](https://github.com/satetsu888/tanuki-kokeshi/actions/workflows/deploy.yml)

たぬきこけしは、日本語の言葉遊びを利用した暗号パズルアプリケーションです。文字の削除や置換といった言語的な変換ルール（ヒント）を適用して、テキストをエンコード・デコードします。

## 🎯 主な機能

### 1. 問題を作る（エンコード）
答えとなる文字列に対して、複数のヒントを逆方向に適用することで暗号化された問題を生成します。

### 2. 経路を探す（パスファインド）
開始文字列から目標文字列まで、利用可能なヒントを適用して変換可能かを探索します。高性能なWebAssemblyエンジンにより、複雑な経路も高速に探索できます。

## 🚀 使い方

### オンライン版
https://satetsu888.github.io/tanuki-kokeshi/ でアクセスできます。

### ローカルでの実行

#### 必要な環境
- Node.js 18以上
- npm または yarn
- Rust（WebAssemblyビルド用、オプション）
- wasm-pack（WebAssemblyビルド用、オプション）

#### インストールと起動

```bash
# リポジトリのクローン
git clone https://github.com/satetsu888/tanuki-kokeshi.git
cd tanuki-kokeshi

# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev
```

ブラウザで http://localhost:30000 を開いてください。

## 🔧 開発

### ビルド

```bash
# 本番用ビルド（TypeScript + Vite + WASM）
npm run build

# プレビュー
npm run preview
```

### WebAssemblyモジュールの個別ビルド

```bash
cd wasm-pathfinder
wasm-pack build --target web --out-dir ../src/wasm-pathfinder
```

## 📝 ヒントシステム

ヒントは使用頻度に基づいて4つのグループに分類されています：

- **グループA**：よく使われるヒント（デフォルトで選択）
- **グループB**：頻繁に使われるヒント
- **グループC**：時々使われるヒント
- **グループD**：まれに使われるヒント

### ヒントの種類

1. **削除ヒント**：特定の文字やパターンを削除
   - 例：「たぬき」→「た」を抜く

2. **置換ヒント**：文字やパターンを別の文字に置換
   - 例：「はみがき」→「はみ」を「き」に置換

## 🏗️ アーキテクチャ

### 主要コンポーネント

- **src/cipher.ts**：エンコード・デコードエンジン
- **src/hints.ts**：ヒント管理とグループ分類
- **src/pathfinder-worker-engine.ts**：WebAssembly経路探索エンジンのラッパー
- **wasm-pathfinder/**：Rustで実装された高性能経路探索エンジン

### 技術スタック

- TypeScript（厳格モード）
- Vite（ビルドツール）
- WebAssembly（Rust + wasm-pack）
- バニラJavaScript（フレームワークなし）

## 🚀 パフォーマンス

WebAssemblyエンジンによる最適化：
- JavaScriptバージョンと比較して10-50倍の性能向上
- A*アルゴリズムによる効率的な探索
- 高度な評価関数（レーベンシュタイン距離 + N-gram類似度）
- リアルタイムプログレス表示とキャンセル機能

## 📖 ドキュメント

- [CLAUDE.md](./CLAUDE.md) - AI開発支援用ガイド
- [README-WASM.md](./README-WASM.md) - WebAssembly実装の詳細
- [SETUP-WASM.md](./SETUP-WASM.md) - WASM開発環境のセットアップ
- [WASM-ENGINE-ARCHITECTURE.md](./WASM-ENGINE-ARCHITECTURE.md) - エンジンアーキテクチャ解説

## 🤝 コントリビューション

プルリクエストを歓迎します！

1. このリポジトリをフォーク
2. 機能ブランチを作成（`git checkout -b feature/amazing-feature`）
3. 変更をコミット（`git commit -m 'Add amazing feature'`）
4. ブランチにプッシュ（`git push origin feature/amazing-feature`）
5. プルリクエストを開く

## 📄 ライセンス

このプロジェクトはMITライセンスの下で公開されています。

## 🙏 謝辞

日本語の言葉遊び文化にインスパイアされたプロジェクトです。