import { getCookie } from 'hono/cookie'
import { getSession } from '../../domain/session.js'

export const sessionMiddleware = async (c, next) => {
  const sessionId = getCookie(c, 'sessionId')
  if (sessionId) {
    const userSession = getSession(sessionId)
    if (userSession) {
      c.set('user', userSession)
      c.set('sessionId', sessionId)
    }
  }
  await next()
}
