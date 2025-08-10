import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Hono } from 'hono'

vi.mock('../src/domain/session.js', () => ({
  addStamp: vi.fn(),
  getSessionData: vi.fn(() => ({ stamps: [] })),
  findOrCreateUser: vi.fn(),
  createSession: vi.fn(),
  deleteSession: vi.fn(),
  getUserIdFromSession: vi.fn(),
}))

vi.mock('../src/domain/lectures.js', () => ({
  getAvailableLectures: vi.fn(() => [
    { id: 'math', name: 'Math' },
    { id: 'history', name: 'History' },
  ]),
}))

import { appRoutes } from '../src/web/routes.jsx'
import { addStamp, getSessionData } from '../src/domain/session.js'

describe('calendar stamp routes', () => {
  let app
  beforeEach(() => {
    addStamp.mockClear()
    getSessionData.mockClear()
    app = new Hono()
    app.use('*', async (c, next) => {
      c.set('user', { id: 'user1' })
      c.set('sessionId', 'sess1')
      await next()
    })
    app.route('/', appRoutes)
  })

  it('returns modal HTML for valid date', async () => {
    const res = await app.request('/calendar/stamp-modal/2024-09-10')
    expect(res.status).toBe(200)
    const text = await res.text()
    expect(text).toContain('<dialog')
    expect(text).toContain('Math')
  })

  it('rejects invalid date format for modal route', async () => {
    const res = await app.request('/calendar/stamp-modal/invalid-date')
    expect(res.status).toBe(400)
  })

  it('returns 401 when user missing for modal route', async () => {
    const noUserApp = new Hono()
    noUserApp.route('/', appRoutes)
    const res = await noUserApp.request('/calendar/stamp-modal/2024-09-10')
    expect(res.status).toBe(401)
  })

  it('adds stamp and returns updated grid', async () => {
    const res = await app.request('/calendar/stamp', {
      method: 'POST',
      body: new URLSearchParams({ date: '2024-09-10', lectureId: 'math' }).toString(),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
    expect(res.status).toBe(200)
    const text = await res.text()
    expect(text).toContain('calendar-grid')
    expect(addStamp).toHaveBeenCalledWith('user1', '2024-09-10', 'math')
  })

  it('rejects invalid input for stamp route', async () => {
    const res = await app.request('/calendar/stamp', {
      method: 'POST',
      body: new URLSearchParams({ date: 'bad', lectureId: 'math' }).toString(),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
    expect(res.status).toBe(400)
  })

  it('returns 401 when user missing for stamp route', async () => {
    const noUserApp = new Hono()
    noUserApp.route('/', appRoutes)
    const res = await noUserApp.request('/calendar/stamp', {
      method: 'POST',
      body: new URLSearchParams({ date: '2024-09-10', lectureId: 'math' }).toString(),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
    expect(res.status).toBe(401)
  })
})
