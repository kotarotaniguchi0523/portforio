import crypto from 'node:crypto'
import {
  findUserById,
  createUser,
  getUserStampsWithLecture,
  addStamp as dbAddStamp,
  createDbSession,
  getDbSession,
  deleteDbSession
} from '../db/index.js'

const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Creates a new persistent session for a given user ID.
 * @param {string} userId - The user's persistent ID from the database.
 * @returns {string} The new session ID.
 */
export function createSession(userId) {
  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  createDbSession(sessionId, userId, expiresAt);
  return sessionId;
}

/**
 * Retrieves user and stamp data based on a session ID.
 * @param {string} sessionId - The ID of the session.
 * @returns {{user: object, stamps: Array<object>}|undefined}
 */
export function getSessionData(sessionId) {
  const session = getDbSession(sessionId);
  if (!session) {
    return undefined;
  }

  // Check for expiration
  if (new Date() > session.expiresAt) {
    deleteDbSession(sessionId);
    return undefined;
  }

  const user = findUserById(session.userId);
  if (!user) {
    deleteDbSession(sessionId);
    return undefined;
  }

  const rawStamps = getUserStampsWithLecture(user.id);
  // Transform the data structure to match what the view component expects.
  const stamps = rawStamps.map(stamp => ({
    date: stamp.date,
    lectureType: stamp.lectureId, // The component expects 'lectureType'
  }));

  return {
    user: {
      id: user.id,
      username: user.displayName,
    },
    stamps,
  };
}

/**
 * Deletes a session from the database.
 * @param {string} sessionId - The ID of the session to delete.
 */
export function deleteSession(sessionId) {
  if (sessionId) {
    deleteDbSession(sessionId);
  }
}


/**
 * Finds a user by their LINE user ID, or creates a new one if they don't exist.
 * @param {string} id - LINE user ID.
 * @param {string} displayName - LINE display name.
 * @returns {object} The found or created user object.
 */
export function findOrCreateUser(id, displayName) {
  let user = findUserById(id);
  if (!user) {
    user = createUser(id, displayName);
    console.log(`New user created: ${displayName} (ID: ${id})`);
  }
  return user;
}

/**
 * Adds a stamp to the database for a given user.
 * @param {string} userId - The user's ID.
 * @param {string} date - ISO date string (YYYY-MM-DD).
 * @param {string} lectureId - The ID of the lecture.
 */
export function addStamp(userId, date, lectureId) {
  dbAddStamp(userId, date, lectureId);
}

/**
 * Gets the user ID associated with a session.
 * @param {string} sessionId - The session ID.
 * @returns {string | undefined} The user ID or undefined.
 */
export function getUserIdFromSession(sessionId) {
    const session = getDbSession(sessionId);
    // Also check expiration here for safety
    if (!session || new Date() > session.expiresAt) {
        return undefined;
    }
    return session.userId;
}
