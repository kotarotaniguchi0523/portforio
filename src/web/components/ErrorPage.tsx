/**
 * A generic error page component.
 * @param {object} props The component props.
 * @param {string} [props.errorTitle='エラーが発生しました'] The title of the error.
 * @param {string} [props.errorMessage='問題が発生しました。しばらくしてからもう一度お試しください。'] The detailed error message.
 */
// biome-ignore lint/nursery/noSecrets: Japanese default error messages are not secrets
export const ErrorPage = ({ errorTitle = 'エラーが発生しました', errorMessage = '問題が発生しました。しばらくしてからもう一度お試しください。' }) => {
  return (
    <>
      <style>{`
        body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background-color: #f0f2f5; }
        .error-container { text-align: center; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); border-left: 5px solid #e74c3c; }
        h1 { color: #e74c3c; }
        p { color: #666; font-size: 18px; }
        a { color: #3498db; text-decoration: none; }
        a:hover { text-decoration: underline; }
      `}</style>
      <div class="error-container">
        <h1>{errorTitle}</h1>
        <p>{errorMessage}</p>
        <br />
        <a href="/">ログインページに戻る</a>
      </div>
    </>
  )
}
