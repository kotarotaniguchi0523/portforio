const http = require('http')
const crypto = require('crypto')

// In‑memory session store. Each entry maps a session ID to
// an object containing a username and a Set of stamped dates.
const sessions = {}

/**
 * Parse the Cookie header into a key/value object.
 *
 * @param {string} cookieHeader The raw Cookie header
 * @returns {Record<string, string>} Parsed cookies
 */
function parseCookies(cookieHeader) {
  const cookies = {}
  if (!cookieHeader) return cookies
  cookieHeader.split(';').forEach((cookie) => {
    const [name, ...rest] = cookie.trim().split('=')
    const value = rest.join('=')
    cookies[name] = decodeURIComponent(value)
  })
  return cookies
}

/**
 * Read and parse the request body. Supports JSON and URL‑encoded forms.
 *
 * @param {http.IncomingMessage} req Incoming HTTP request
 * @returns {Promise<Record<string, any>>} Parsed body
 */
function parseRequestBody(req) {
  return new Promise((resolve) => {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
    })
    req.on('end', () => {
      const contentType = req.headers['content-type'] || ''
      if (contentType.includes('application/json')) {
        try {
          const parsed = JSON.parse(body)
          resolve(parsed)
        } catch {
          resolve({})
        }
      } else if (contentType.includes('application/x-www-form-urlencoded')) {
        const params = new URLSearchParams(body)
        const obj = {}
        for (const [key, value] of params.entries()) obj[key] = value
        resolve(obj)
      } else {
        resolve({})
      }
    })
  })
}

/**
 * Render the login page. Users can enter a username to start a session.
 *
 * @returns {string} Complete HTML for the login page
 */
function renderLoginPage() {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>ログイン</title>
  <style>
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
  </style>
</head>
<body>
  <div class="login-container">
    <h2>ログイン</h2>
    <form method="POST" action="/login">
      <label for="username">ユーザー名:</label><br>
      <input id="username" type="text" name="username" required /><br>
      <button type="submit">ログイン</button>
    </form>
  </div>
</body>
</html>`
}

/**
 * Generate an array of dates and blanks for the specified month. Blank
 * values are represented with null so the client knows to render an
 * empty cell. The grid always starts on Sunday and ends on Saturday.
 *
 * @param {number} year Four‑digit year (e.g. 2025)
 * @param {number} month Zero‑based month (January = 0)
 * @returns {(Date|null)[]} An array of Date objects or nulls
 */
function getMonthDates(year, month) {
  const dates = []
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  // Fill initial blanks for days before the first
  for (let i = 0; i < firstDay.getDay(); i++) {
    dates.push(null)
  }
  // Actual dates
  for (let d = 1; d <= lastDay.getDate(); d++) {
    dates.push(new Date(year, month, d))
  }
  // Fill trailing blanks until the length is divisible by 7
  while (dates.length % 7 !== 0) {
    dates.push(null)
  }
  return dates
}

/**
 * Render the calendar page for a logged in user. The page loads
 * htmx for server communication and uses hono/jsx/dom on the client
 * to create a dynamic calendar component. Only stamping is interactive.
 *
 * @param {string} username Logged in user name
 * @param {Set<string>} stampsSet Set of ISO date strings that are stamped
 * @returns {string} Complete HTML for the calendar page
 */
function renderCalendarPage(username, stampsSet) {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() // 0‑indexed
  const dates = getMonthDates(year, month)
  const stampsObj = {}
  stampsSet.forEach((d) => {
    stampsObj[d] = true
  })
  const monthName = `${year}年${month + 1}月`

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>スタンプカレンダー</title>
  <!-- htmx is used to send POST requests for stamping -->
  <script src="https://unpkg.com/htmx.org@1.9.10"></script>
  <style>
    body {
      font-family: sans-serif;
      background: #f7f9fb;
      margin: 0;
      padding: 0;
    }
    header {
      background: #4a90e2;
      color: white;
      padding: 1rem 2rem;
      text-align: center;
    }
    #calendar-container {
      max-width: 800px;
      margin: 30px auto;
      background: white;
      padding: 20px;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }
    .calendar-grid {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 5px;
    }
    .day-header {
      font-weight: bold;
      text-align: center;
      padding: 8px 0;
      background: #eef3fa;
      border-radius: 4px;
    }
    .calendar-cell {
      min-height: 80px;
      position: relative;
      padding: 8px;
      border-radius: 6px;
      cursor: pointer;
      transition: background 0.2s;
    }
    .calendar-cell:hover {
      background: #f0f8ff;
    }
    .calendar-cell.disabled {
      background: #f5f5f5;
      cursor: default;
    }
    .date-number {
      font-size: 14px;
      font-weight: bold;
    }
    .stamp {
      position: absolute;
      bottom: 5px;
      right: 5px;
      font-size: 24px;
    }
  </style>
</head>
<body>
  <header>
    <h1>${monthName}</h1>
    <p>${username} さんのスタンプカレンダー</p>
  </header>
  <div id="calendar-container">
    <div id="calendar"></div>
  </div>
  <!-- Pass initial data to the client as JSON in a script tag -->
  <script id="initial-data" type="application/json">${JSON.stringify({
    year,
    month,
    dates: dates.map((d) => (d ? d.toISOString().split('T')[0] : null)),
    stamps: stampsObj,
  })}</script>
  <script type="module">
    // Import the lightweight JSX runtime and hooks from hono/jsx/dom
    import { render, useState, jsx } from 'https://esm.sh/hono/jsx/dom'
    const container = document.getElementById('calendar')
    const data = JSON.parse(document.getElementById('initial-data').textContent)
    // Choose your stamp icon – you can swap this for any emoji or character
    const STAMP_ICON = '✅'

    function CalendarApp() {
      const [stamps, setStamps] = useState(data.stamps)

      // Handle clicking on a date cell. Only un‑stamped dates respond.
      function handleClick(date) {
        if (!date) return
        if (stamps[date]) return
        const updated = { ...stamps, [date]: true }
        setStamps(updated)
        // Use htmx to send a POST request. hx-swap="none" prevents swapping.
        if (window.htmx) {
          htmx.ajax('POST', '/stamp', { values: { date } })
        } else {
          // Fallback to fetch if htmx isn't loaded
          fetch('/stamp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date }),
          })
        }
      }

      // Build the calendar cells, starting with the day name headers
      const dayNames = ['日', '月', '火', '水', '木', '金', '土']
      const cells = []
      for (let i = 0; i < 7; i++) {
        cells.push(jsx('div', { class: 'day-header' }, dayNames[i]))
      }
      // Create a cell for each date (or blank). Each valid date is interactive.
      data.dates.forEach((iso) => {
        if (!iso) {
          cells.push(jsx('div', { class: 'calendar-cell disabled' }, ''))
        } else {
          const dayNumber = parseInt(iso.split('-')[2], 10)
          const stamped = stamps[iso]
          const contentChildren = []
          contentChildren.push(
            jsx('div', { class: 'date-number' }, dayNumber.toString())
          )
          if (stamped) {
            contentChildren.push(jsx('div', { class: 'stamp' }, STAMP_ICON))
          }
          const attrs = {
            class: 'calendar-cell',
            onclick: () => handleClick(iso),
            'hx-post': '/stamp',
            'hx-vals': JSON.stringify({ date: iso }),
            'hx-swap': 'none',
          }
          cells.push(
            jsx(
              'div',
              attrs,
              jsx('div', { class: 'calendar-cell-content' }, ...contentChildren)
            )
          )
        }
      })
      return jsx('div', { class: 'calendar-grid' }, ...cells)
    }
    // Mount the calendar into the page
    render(jsx(CalendarApp, {}), container)
  </script>
</body>
</html>`
}

// Create the HTTP server with routes for login, calendar and stamping
const server = http.createServer(async (req, res) => {
  const method = req.method || ''
  const urlObj = new URL(req.url || '', `http://${req.headers.host}`)
  const pathname = urlObj.pathname
  const cookies = parseCookies(req.headers.cookie)
  const sessionId = cookies.sessionId
  const user = sessionId && sessions[sessionId]

  // Redirect logged in users at root to the calendar
  if (method === 'GET' && pathname === '/') {
    if (user) {
      res.writeHead(302, { Location: '/calendar' })
      res.end()
    } else {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      res.end(renderLoginPage())
    }
    return
  }

  // Handle login form submission
  if (method === 'POST' && pathname === '/login') {
    const body = await parseRequestBody(req)
    const username = (body.username || '').trim()
    if (!username) {
      res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' })
      res.end('ユーザー名を入力してください。')
      return
    }
    const id = crypto.randomUUID()
    sessions[id] = { username, stamps: new Set() }
    res.writeHead(302, {
      Location: '/calendar',
      'Set-Cookie': `sessionId=${id}; Path=/; HttpOnly`,
    })
    res.end()
    return
  }

  // Serve the calendar for logged in users
  if (method === 'GET' && pathname === '/calendar') {
    if (!user) {
      res.writeHead(302, { Location: '/' })
      res.end()
      return
    }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end(renderCalendarPage(user.username, user.stamps))
    return
  }

  // Handle stamping requests. Accept JSON or form encoded bodies.
  if (method === 'POST' && pathname === '/stamp') {
    if (!user) {
      res.writeHead(401, { 'Content-Type': 'text/plain; charset=utf-8' })
      res.end('ログインしてください。')
      return
    }
    const body = await parseRequestBody(req)
    const date = body.date
    if (date) {
      user.stamps.add(date)
    }
    // Return JSON for completeness, although the client doesn't swap
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ok: true }))
    return
  }

  // Fallback for all other routes
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
  res.end('Not Found')
})

// Start listening on the configured port (defaults to 3000)
const PORT = process.env.PORT || 3000
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`)
})