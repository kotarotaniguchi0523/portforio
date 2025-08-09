import { jsx } from 'hono/jsx'

export const LectureSelectionPage = ({ username, lectures = [] }) => {
  return (
    <>
      <style>{`
        body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background-color: #f0f2f5; }
        .selection-container { text-align: center; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        h1, h2 { color: #333; }
        p { color: #666; }
        select, button { font-size: 16px; padding: 10px; margin-top: 10px; border-radius: 8px; border: 1px solid #ccc; }
        button { background-color: #4a90e2; color: white; cursor: pointer; transition: background-color 0.3s; }
        button:hover { background-color: #357abd; }
      `}</style>
      <div class="selection-container">
        <h1>ようこそ、{username}さん！</h1>
        <h2>今日の講義を選択してください</h2>
        <p>出席スタンプを記録します。</p>
        <form hx-post="/stamp" hx-target="body" hx-swap="outerHTML">
          <select name="lectureId" required>
            {lectures.map(lecture => (
              <option value={lecture.id}>{lecture.name}</option>
            ))}
          </select>
          <br />
          <button type="submit">スタンプを押す</button>
        </form>
      </div>
      <script>
        {`setTimeout(() => { window.location.href = '/logout'; }, 20000);`}
      </script>
    </>
  )
}
