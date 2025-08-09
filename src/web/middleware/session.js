import { getCookie } from 'hono/cookie'
import { getSessionData } from '../../domain/session.js'

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
