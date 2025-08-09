import { jsx } from 'hono/jsx'

export const LoginPage = () => (
  <>
    <style>{`
      body {
        font-family: sans-serif;
        padding: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100vh;
        background: #f7f7f7;
      }
      .login-container {
        background: white;
        padding: 30px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      }
      input[type=text] {
        padding: 8px;
        font-size: 16px;
        width: 200px;
      }
      button {
        margin-top: 10px;
        padding: 8px 16px;
        font-size: 16px;
      }
    `}</style>
    <div class="login-container">
      <h2>ログイン</h2>
      <form method="POST" action="/login">
        <label for="username">ユーザー名:</label><br />
        <input id="username" type="text" name="username" required /><br />
        <button type="submit">ログイン</button>
      </form>
    </div>
  </>
)
