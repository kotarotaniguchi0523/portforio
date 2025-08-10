# スタンプカレンダー LINEログイン版

## 1. プロジェクト概要

このアプリケーションは、LINEログインを利用した多機能なスタンプカレンダーです。クリーンアーキテクチャの考え方を採用しており、サーバーサイドはHono、データベース操作にはDrizzle ORMを使用しています。ユーザーはLINEアカウントで安全にログインし、日々の活動をスタンプで記録することができます。

## 2. アーキテクチャと技術スタック

### アーキテクチャ
- **サーバー**: Node.js 上で動作する Hono アプリケーション。
- **アーキテクチャ**: 関心事の分離（ドメイン、インフラ、Web）を意識したクリーンアーキテクチャ。
- **認証**: LINEログインを利用したOAuth 2.0フロー。
- **永続化**: Drizzle ORM を介して SQLite データベースを操作。
- **レンダリング**: Hono/JSX によるサーバーサイドレンダリング (SSR)。
- **動的更新**: HTMX を利用した部分的なページ更新。

### 技術スタック
- **フレームワーク**: [Hono](https://hono.dev/)
- **UI**: [Hono/JSX](https://hono.dev/guides/jsx)
- **クライアントサイド**: [htmx](https://htmx.org/)
- **ORM**: [Drizzle ORM](https://orm.drizzle.team/)
- **データベース**: [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) (SQLite)
- **パッケージ管理**: [pnpm](https://pnpm.io/)
- **テスト**: [Vitest](https://vitest.dev/) (ユニット/統合), [Playwright](https://playwright.dev/) (E2E)
- **実行環境**: [Node.js](https://nodejs.org/) / [tsx](https://github.com/esbuild-kit/tsx)

## 3. フォルダ構成

```
.
├── e2e/                  # E2Eテスト (Playwright)
├── src/                  # アプリケーションのソースコード
│   ├── db/               # Drizzle ORM のスキーマ定義、マイグレーション
│   ├── domain/           # ビジネスロジック
│   └── web/              # Hono のルーティング、ミドルウェア、UIコンポーネント
├── AGENTS.md             # AIエージェント向けの開発ガイド
├── drizzle.config.ts     # Drizzle Kit の設定
├── package.json          # プロジェクトの定義と依存関係
├── pnpm-lock.yaml        # 依存関係のロックファイル
├── playwright.config.ts  # Playwright の設定
└── README.md             # このファイル
```

## 4. 環境のセットアップ

### 前提条件
- [Node.js](https://nodejs.org/) (v22.x 推奨)
- [pnpm](https://pnpm.io/installation)

### 手順
1.  **リポジトリのクローン:**
    ```bash
    git clone <repository-url>
    cd <repository-name>
    ```

2.  **依存関係のインストール:**
    プロジェクトのルートで以下のコマンドを実行します。`npm`や`yarn`は使用しないでください。
    ```bash
    pnpm install
    ```

3.  **環境変数の設定:**
    プロジェクトのルートに `.env` ファイルを作成し、LINE Developers Consoleから取得した認証情報などを設定します。

    ```env
    # .env.example

    # LINE Login Credentials
    LINE_CHANNEL_ID="YOUR_LINE_CHANNEL_ID"
    LINE_CHANNEL_SECRET="YOUR_LINE_CHANNEL_SECRET"
    LINE_CALLBACK_URL="http://localhost:3000/auth/line/callback"

    # Session secret for signing cookies
    # 以下のコマンド等で強力な秘密鍵を生成してください
    # node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
    SESSION_SECRET="YOUR_STRONG_RANDOM_SECRET"

    # Database file path
    DATABASE_URL="./data.db"
    ```

4.  **データベースのマイグレーション:**
    テーブルを作成するために、以下のコマンドを実行します。
    ```bash
    pnpm run db:migrate
    ```

## 5. 主要なコマンド

- **開発サーバーの起動:**

  ```bash
  pnpm run dev
  ```
  ファイル変更を監視し、自動でリロードします。サーバーは `http://localhost:3000` で起動します。

- **本番モードでの起動:**

  ```bash
  pnpm run start
  ```

- **ユニットテストの実行:**

  ```bash
  pnpm run test
  ```

- **E2Eテストの実行:**

  ```bash
  pnpm run test:e2e
  ```

- **データベーススキーマの更新:**

  `src/db/schema.ts` を編集した後、以下のコマンドでマイグレーションファイルを生成します。
  ```bash
  pnpm run db:generate
  ```

