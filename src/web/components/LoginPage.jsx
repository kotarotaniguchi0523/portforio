import { jsx } from 'hono/jsx'

/**
 * Renders the login page for the application.
 * It provides a single button to initiate the LINE login flow.
 */
export const LoginPage = () => {
  return (
    <>
      <style>{`
        body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background-color: #f0f2f5; }
        .login-container { text-align: center; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        h1 { color: #333; }
        .line-login-btn { display: inline-block; padding: 12px 24px; background-color: #00B900; color: white; text-decoration: none; font-weight: bold; border-radius: 8px; transition: background-color 0.3s; }
        .line-login-btn:hover { background-color: #00a300; }
      `}</style>
      <div class="login-container">
        <h1>スタンプカレンダー</h1>
        <p>LINEアカウントでログインしてください。</p>
        <a href="/login/line" class="line-login-btn">
          LINEでログイン
        </a>
      </div>
    </>
  )
}
