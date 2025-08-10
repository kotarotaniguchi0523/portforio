import { getCookie } from 'hono/cookie'
import { getSessionData } from '../../domain/session.js'

/**
 * Hono middleware to handle user sessions.
 * It checks for a `sessionId` cookie, retrieves the corresponding session data,
 * and sets `user`, `stamps`, and `sessionId` on the context (`c`) if the session is valid.
 * This makes session data available to all subsequent middleware and route handlers.
 * @param {import('hono').Context} c The Hono context object.
 * @param {import('hono').Next} next The next middleware function in the chain.
 */
export const sessionMiddleware = async (c, next) => {
  const sessionId = getCookie(c, 'sessionId')
  if (sessionId) {
    const sessionData = getSessionData(sessionId)
    if (sessionData) {
      c.set('user', sessionData.user)
      c.set('stamps', sessionData.stamps)
      c.set('sessionId', sessionId)
    }
  }
  await next()
}
