import { Hono } from 'hono'
import { setCookie, getCookie } from 'hono/cookie'
import { LoginPage } from './components/LoginPage.jsx'
import { CalendarPage, CalendarGrid } from './components/CalendarPage.jsx'
import { ErrorPage } from './components/ErrorPage.jsx'
// Domain imports
import { addStamp, findOrCreateUser, createSession, deleteSession, getSessionData } from '../domain/session.js'
import { getAvailableLectures } from '../domain/lectures.js'
import { getMonthDates } from '../domain/calendar.js'
import crypto from 'crypto'

export const appRoutes = new Hono()

// Route to fetch the modal for stamping a date
appRoutes.get('/calendar/stamp-modal/:date', (c) => {
  const user = c.get('user');
  if (!user) {
    return c.body(null, 401);
  }
  const { date } = c.req.param();
  const lectures = getAvailableLectures();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return c.text('Invalid date format', 400);
  }

  // Use a <dialog> element for the modal. HTMX will place this in the DOM.
  return c.html(
    <dialog class="modal" open>
      <div class="modal-content">
        <p><strong>{date}</strong></p>
        <p>Which lecture stamp would you like to add?</p>
        <form
          hx-post="/calendar/stamp"
          hx-target="#calendar-grid"
          hx-swap="outerHTML"
        >
          <input type="hidden" name="date" value={date} />
          <select name="lectureId" class="lecture-select">
            {lectures.map(lecture => (
              <option value={lecture.id}>{lecture.name}</option>
            ))}
          </select>
          <div class="modal-actions">
            <button type="submit" class="btn-confirm">Stamp</button>
            <button type="button" class="btn-cancel" onclick="this.closest('dialog').close()">Cancel</button>
          </div>
        </form>
      </div>
    </dialog>
  );
});

// Route to handle the actual stamping via POST
appRoutes.post('/calendar/stamp', async (c) => {
    const user = c.get('user');
    if (!user) { return c.text('Unauthorized', 401); }

    const body = await c.req.parseBody();
    const { date, lectureId } = body;

    // Basic validation
    if (!date || !lectureId || typeof date !== 'string' || typeof lectureId !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return c.text('Invalid input', 400);
    }

    try {
        addStamp(user.id, date, lectureId);
    } catch (err) {
        console.error('Failed to add stamp:', err);
        return c.text('Failed to add stamp. Please try again later.', 500);
    }

    // Re-fetch all session data to get updated stamps
    const sessionData = getSessionData(c.get('sessionId'));
    const stamps = sessionData ? sessionData.stamps : [];

    // Re-render the calendar grid for the month of the stamped date
    const targetDate = new Date(date);
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();
    const dates = getMonthDates(year, month);

    const newGrid = <CalendarGrid year={year} month={month} dates={dates} stamps={stamps} />;
    // This script will be executed by htmx after swapping the content.
    // It finds the modal by its class and removes it from the DOM.
    const closeModalScript = `
        const dialog = document.querySelector('.modal');
        if (dialog) {
            dialog.remove();
        }
    `;

    // Return the updated grid and the script to close the modal.
    // We wrap them in a fragment <>...</> to satisfy JSX's single root element rule.
    // The modal should be closed by client-side logic after the grid is updated.
    // You can use HTMX events or a custom event to trigger modal removal.

    // Return only the updated grid.
    // We wrap it in a fragment <>...</> to satisfy JSX's single root element rule.
    return c.html(<>{newGrid}</>);
});

// Route: GET / - Redirect to calendar if logged in, otherwise show login page
appRoutes.get('/', (c) => {
  const user = c.get('user')
  if (user) {
    return c.redirect('/calendar')
  }
  return c.render(<LoginPage />, { title: 'ログイン' })
})

// Route: GET /calendar - Show the calendar page
appRoutes.get('/calendar', (c) => {
  const user = c.get('user')
  const stamps = c.get('stamps') // Get stamps from context
  if (!user) {
    return c.redirect('/')
  }
  // Pass the array of stamp objects to the component.
  // The component will need to be updated to handle this new data structure.
  return c.render(<CalendarPage username={user.username} stamps={stamps} />, {
    title: 'スタンプカレンダー',
  })
})

// Route: GET /logout - Handle user logout
appRoutes.get('/logout', (c) => {
  const sessionId = getCookie(c, 'sessionId')
  if (sessionId) {
    deleteSession(sessionId)
    setCookie(c, 'sessionId', '', { expires: new Date(0), path: '/' })
  }
  return c.redirect('/')
})

// === LINE Login Routes ===

// 1. Redirect user to LINE for authentication
appRoutes.get('/login/line', (c) => {
  const state = crypto.randomBytes(16).toString('hex')
  setCookie(c, 'line_state', state, { path: '/', httpOnly: true, secure: c.req.url.startsWith('https://'), sameSite: 'Lax' })

  const scope = 'profile openid'
  const url = 'https://access.line.me/oauth2/v2.1/authorize?' +
    `response_type=code` +
    `&client_id=${process.env.LINE_CHANNEL_ID}` +
    `&redirect_uri=${process.env.LINE_CALLBACK_URL}` +
    `&state=${state}` +
    `&scope=${scope}`

  return c.redirect(url)
})

// 2. Handle callback from LINE
appRoutes.get('/auth/line/callback', async (c) => {
  const { code, state } = c.req.query()
  const storedState = getCookie(c, 'line_state')

  // Delete the state cookie immediately after use to prevent reuse.
  setCookie(c, 'line_state', '', { expires: new Date(0), path: '/' })

  if (!state || !storedState || state !== storedState) {
    return c.text('State mismatch or cookie missing. CSRF attack detected.', 400)
  }

  try {
    // Exchange authorization code for access token
    const tokenUrl = 'https://api.line.me/oauth2/v2.1/token'
    const tokenParams = new URLSearchParams()
    tokenParams.append('grant_type', 'authorization_code')
    tokenParams.append('code', code)
    tokenParams.append('redirect_uri', process.env.LINE_CALLBACK_URL)
    tokenParams.append('client_id', process.env.LINE_CHANNEL_ID)
    tokenParams.append('client_secret', process.env.LINE_CHANNEL_SECRET)

    const tokenRes = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenParams,
    })

    if (!tokenRes.ok) {
      const errorBody = await tokenRes.text()
      throw new Error(`Failed to issue token: ${tokenRes.status} ${errorBody}`)
    }
    const tokenData = await tokenRes.json()
    const accessToken = tokenData.access_token

    // Get user profile using the access token
    const profileUrl = 'https://api.line.me/v2/profile'
    const profileRes = await fetch(profileUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!profileRes.ok) {
      const errorBody = await profileRes.text()
      throw new Error(`Failed to get profile: ${profileRes.status} ${errorBody}`)
    }
    const profile = await profileRes.json()

    // Find or create user in our database
    const user = findOrCreateUser(profile.userId, profile.displayName)

    // Create a new session for the user
    const sessionId = createSession(user.id)
    setCookie(c, 'sessionId', sessionId, { path: '/', httpOnly: true, secure: c.req.url.startsWith('https://'), sameSite: 'Lax' })

    // Redirect to the calendar page
    return c.redirect('/calendar')

  } catch (error) {
    console.error('LINE Login Error:', error)
    return c.render(<ErrorPage errorTitle="ログインエラー" errorMessage="LINEでのログインに失敗しました。時間をおいて再度お試しください。" />, {
      title: 'エラー',
    })
  }
})
