import { Hono } from 'hono'
import { setCookie } from 'hono/cookie'
import { jsx } from 'hono/jsx'
import { LoginPage } from './components/LoginPage.jsx'
import { CalendarPage, CalendarGrid } from './components/CalendarPage.jsx'
import { createSession, addStampToSession, getSession } from '../domain/session.js'
import { getMonthDates } from '../domain/calendar.js'

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

// Route: POST /login - Handle user login
appRoutes.post('/login', async (c) => {
  const body = await c.req.parseBody()
  const username = (body.username || '').trim()

  if (!username) {
    return c.text('ユーザー名を入力してください。', 400)
  }

  const sessionId = createSession(username)
  setCookie(c, 'sessionId', sessionId, { path: '/', httpOnly: true, secure: c.req.url.startsWith('https://'), sameSite: 'Lax' })
  return c.redirect('/calendar')
})

// Route: GET /calendar - Show the calendar page
appRoutes.get('/calendar', (c) => {
  const user = c.get('user')
  if (!user) {
    return c.redirect('/')
  }
  return c.render(<CalendarPage username={user.username} stampsSet={user.stamps} />, {
    title: 'スタンプカレンダー',
  })
})

// Route: POST /stamp - Handle a stamping action
appRoutes.post('/stamp', async (c) => {
  const user = c.get('user')
  if (!user) {
    // NOTE: In a real htmx scenario, you might return a redirect header
    // or a specific component indicating an error or session timeout.
    // For now, we'll rely on the user being logged in.
    return c.text('Unauthorized', 401)
  }

  const sessionId = c.get('sessionId')
  if (!sessionId) {
    return c.text('Invalid session', 401)
  }

  const body = await c.req.parseBody()
  const { date, year, month } = body

  if (date && typeof date === 'string' && isValidISODateString(date)) {
    addStampToSession(sessionId, date)
  }

  // Use the year and month from the request, falling back to the current date
  // to ensure the correct month is re-rendered.
  const now = new Date()
  const renderYear = year ? parseInt(year, 10) : now.getFullYear()
  const renderMonth = month ? parseInt(month, 10) : now.getMonth()

  const dates = getMonthDates(renderYear, renderMonth)
  const updatedUser = getSession(sessionId) // Get the most recent session data

  const component = <CalendarGrid year={renderYear} month={renderMonth} dates={dates} stampsSet={updatedUser.stamps} />
  return c.html(component)
})
