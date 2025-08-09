import { Hono } from 'hono'
import { setCookie, getCookie } from 'hono/cookie'
import { jsx } from 'hono/jsx'
import { LoginPage } from './components/LoginPage.jsx'
import { CalendarPage, CalendarGrid } from './components/CalendarPage.jsx'
import { LectureSelectionPage } from './components/LectureSelectionPage.jsx'
// Updated imports
import { addStamp, getUserIdFromSession, findOrCreateUser, createSession } from '../domain/session.js'
import { getMonthDates } from '../domain/calendar.js'
import crypto from 'crypto'

/**
 * Validates if a string is a valid ISO 8601 date string (YYYY-MM-DD).
 * @param {string} dateString The string to validate.
 * @returns {boolean} True if the string is a valid date.
 */
function isValidISODateString(dateString) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return false
  }
  const d = new Date(dateString)
  return d instanceof Date && !isNaN(d) && d.toISOString().slice(0, 10) === dateString
}

export const appRoutes = new Hono()

// Route: GET / - Redirect to calendar if logged in, otherwise show login page
appRoutes.get('/', (c) => {
  const user = c.get('user')
  if (user) {
    return c.redirect('/calendar')
  }
  return c.render(<LoginPage />, { title: 'ログイン' })
})

// POST /login route is removed. It will be replaced with LINE Login flow.

// Route: GET /select-lecture - Show the lecture selection page
appRoutes.get('/select-lecture', (c) => {
  const user = c.get('user')
  if (!user) {
    return c.redirect('/')
  }
  return c.render(<LectureSelectionPage username={user.username} />, {
    title: '講義を選択',
  })
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

// Route: POST /stamp - Handle lecture selection and create a stamp
appRoutes.post('/stamp', async (c) => {
  const user = c.get('user')
  if (!user) {
    return c.text('Unauthorized', 401)
  }

  const sessionId = c.get('sessionId')
  const userId = getUserIdFromSession(sessionId)
  if (!userId) {
    return c.text('Invalid session', 401)
  }

  const body = await c.req.parseBody()
  const lectureType = body.lectureType

  if (!lectureType || typeof lectureType !== 'string') {
    return c.text('Invalid lecture type.', 400)
  }

  // Stamp for today's date
  const today = new Date().toISOString().slice(0, 10)
  addStamp(userId, today, lectureType)

  // After stamping, redirect the user to the calendar page
  c.header('HX-Redirect', '/calendar')
  return c.body(null, 200)
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

    // Redirect to the lecture selection page
    return c.redirect('/select-lecture')

  } catch (error) {
    console.error('LINE Login Error:', error)
    return c.text('Failed to log in with LINE.', 500)
  }
})
