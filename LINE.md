# LINEログイン実装ガイド

LINEログインを本プロジェクトに完全に実装するために必要な情報をまとめています。

## 1. 事前準備
- [LINE Developers](https://developers.line.biz/) にてプロバイダーとLINEログインチャンネルを作成する。
- チャンネル設定でCallback URL (`/auth/line/callback`) を登録する。
- `Channel ID` と `Channel secret` を取得する。

## 2. 環境変数
`.env` に以下の値を設定する。値はLINE Developersで発行されたものに置き換える。

```env
LINE_CHANNEL_ID="<your channel id>"
LINE_CHANNEL_SECRET="<your channel secret>"
LINE_CALLBACK_URL="http://localhost:3000/auth/line/callback"
```

## 3. 認証フロー
LINEログインはOAuth 2.0のAuthorization Codeフローで実装する。

1. **認証リクエスト**
   - ユーザーを `https://access.line.me/oauth2/v2.1/authorize` にリダイレクトする。
   - パラメータ例:
     - `response_type=code`
     - `client_id` にChannel ID
     - `redirect_uri` に登録済みCallback URL
     - `state` にCSRF対策用ランダム文字列
     - `scope=profile openid`
2. **コールバック受信**
   - クエリで渡される `code` と `state` を取得する。
   - Cookieに保存した `state` と一致するか確認してCSRFを防止する。
3. **アクセストークン発行**
   - `https://api.line.me/oauth2/v2.1/token` へ `application/x-www-form-urlencoded` でPOST。
   - 必須パラメータ:
     - `grant_type=authorization_code`
     - `code`
     - `redirect_uri`
     - `client_id`
     - `client_secret`
   - レスポンスから `access_token` (必要に応じて `id_token` や `refresh_token`) を取得する。
4. **ユーザープロフィール取得**
   - `GET https://api.line.me/v2/profile` に `Authorization: Bearer <access_token>` を付与してリクエスト。
   - `userId` と `displayName` を受け取り、アプリ内ユーザーとして保存または更新する。
5. **セッション生成**
   - アプリケーション独自のセッションIDを発行し、クッキーに保存する。
   - セッション情報（ユーザーID・有効期限など）をデータベースへ永続化する。
6. **ログアウト/トークン無効化 (任意)**
   - `https://api.line.me/oauth2/v2.1/revoke` にPOSTし、アクセストークンとリフレッシュトークンを破棄する。

## 4. セキュリティのポイント
- `state` パラメータとCookieを用いてCSRFを防止する。
- クッキーは `HttpOnly`・`Secure`・`SameSite=Lax` などの属性で保護する。
- IDトークンを利用する場合は、`https://api.line.me/oauth2/v2.1/verify` エンドポイントで署名とペイロードを検証する。
- チャンネルシークレットは環境変数やシークレットマネージャで安全に管理する。

## 5. 参考資料
- LINEログイン ドキュメント: https://developers.line.biz/en/docs/line-login/overview/
- OAuth 2.0 Authorization Code Flow: https://datatracker.ietf.org/doc/html/rfc6749#section-4.1
