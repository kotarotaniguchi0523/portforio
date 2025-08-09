# プロジェクト概要

このドキュメントは、AIエージェントがこのプロジェクトの概要を理解し、開発を円滑に進めるためのガイドです。

## 1. アーキテクチャ

このアプリケーションは、サーバーサイドでHTMLをレンダリングし、クライアントサイドのインタラクションを最小限のJavaScriptで実現する **Hypermedia-driven Application (HDA)** アーキテクチャを採用しています。

- **サーバー**: Node.js上で動作するHonoアプリケーションです。
- **認証**: **LINEログイン** を利用したOAuth 2.0フローを実装しています。ユーザーはLINEアカウントで認証し、アプリケーションはプロフィール情報（ユーザーID、表示名）を取得します。
- **永続化**: **SQLite** データベース (`better-sqlite3`を使用) を導入し、ユーザー情報とスタンプ記録を永続化しています。これにより、サーバーを再起動してもデータが失われることはありません。
- **レンダリング**: サーバーサイドレンダリング (SSR) が基本です。HonoのJSXエンジンがUIコンポーネントをHTMLに変換してクライアントに送信します。
- **動的更新**: HTMXを利用しています。講義選択フォームの送信などをハンドルし、ページ全体のリロードなしでサーバーからの指示（リダイレクトなど）に従います。

## 2. 技術スタック

- **フレームワーク**: [Hono](https://hono.dev/)
- **ビュー (UI)**: [Hono/JSX](https://hono.dev/guides/jsx)
- **クライアントサイド**: [htmx](https://htmx.org/)
- **データベース**: [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) (SQLite)
- **LINE連携**: [@line/bot-sdk](https://github.com/line/line-bot-sdk-nodejs)
- **環境変数管理**: [dotenv](https://github.com/motdotla/dotenv)
- **実行環境**: [Node.js](https://nodejs.org/)
- **トランスパイラ/ランナー**: [tsx](https://github.com/esbuild-kit/tsx)

## 3. セットアップ

開発を開始する前に、プロジェクトのルートディレクトリに `.env` ファイルを作成し、以下の環境変数を設定する必要があります。

```env
# .env

# LINE Login Credentials
# LINE Developers Consoleから取得した実際の認証情報に置き換えてください
LINE_CHANNEL_ID="my-channel-id"
LINE_CHANNEL_SECRET="my-channel-secret"
LINE_CALLBACK_URL="http://localhost:3000/auth/line/callback"

# Session secret for signing cookies
SESSION_SECRET="a-very-secret-string-that-should-be-changed"
```

## 4. ゴール

このプロジェクトの主なゴールは、以下の通りです。

- **シンプルさの維持**: 複雑なフロントエンドのビルドプロセスや状態管理ライブラリを避け、軽量なスタックで完結させること。
- **外部サービス連携**: LINEログインのような外部の認証サービスとスムーズに連携する機能を実装すること。
- **高い生産性**: サーバーサイドのロジックとビューを同じ言語（JavaScript/JSX）で記述し、コンテキストスイッチを減らすこと。
- **優れたパフォーマンス**: ページ全体の再読み込みを避け、htmxによる部分更新やリダイレクトを効果的に活用すること。
- **保守性の確保**: 関心事の分離（データベース、ドメインロジック、Web層）を意識した設計を維持し、将来の機能追加を容易にすること。
