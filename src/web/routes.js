import { Hono } from 'hono'
import { setCookie } from 'hono/cookie'
import { LoginPage } from './components/LoginPage.jsx'
import { CalendarPage } from './components/CalendarPage.jsx'
import { createSession, addStampToSession } from '../domain/session.js'

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
  setCookie(c, 'sessionId', sessionId, { path: '/', httpOnly: true })
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
    return c.json({ ok: false, error: 'Unauthorized' }, 401)
  }

  // We need the session ID to add the stamp
  const sessionId = c.get('sessionId')
  if (!sessionId) {
    // This case should ideally not happen if the user middleware ran correctly
    return c.json({ ok: false, error: 'Invalid session' }, 401)
  }

  const body = await c.req.parseBody()
  const date = body.date
  if (date && typeof date === 'string') {
    if (!isValidISODateString(date)) {
      return c.json({ ok: false, error: 'Invalid date format' }, 400)
    }
    addStampToSession(sessionId, date)
  }

  return c.json({ ok: true })
})
