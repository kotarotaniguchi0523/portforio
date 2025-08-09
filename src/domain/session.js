import crypto from 'crypto'

// In‑memory session store.
const sessions = {}

/**
 * Creates a new session for a user.
 * @param {string} username The user's name.
 * @returns {string} The new session ID.
 */
export function createSession(username) {
  const id = crypto.randomUUID()
  sessions[id] = { username, stamps: new Set() }
  return id
}

/**
 * Retrieves a session by its ID.
 * @param {string} sessionId The ID of the session.
 * @returns {({username: string, stamps: Set<string>}) | undefined} The session object or undefined.
 */
export function getSession(sessionId) {
  return sessions[sessionId]
}

/**
 * Adds a stamped date to a user's session.
 * @param {string} sessionId The ID of the session.
 * @param {string} date The ISO date string to add.
 */
export function addStampToSession(sessionId, date) {
  if (sessions[sessionId] && date) {
    sessions[sessionId].stamps.add(date)
  }
}
