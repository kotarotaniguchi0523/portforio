import 'dotenv/config';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema.js';
import { eq } from 'drizzle-orm';

const sqlite = new Database(process.env.DATABASE_URL);
export const db = drizzle(sqlite, { schema });

// --- Seeding ---
// Seed the database with initial lecture data if it's empty.
function seedLectures() {
  const lectures = [
    { id: 'math', name: '微分積分学' },
    { id: 'science', name: '量子力学' },
    { id: 'history', name: '世界史' },
    { id: 'english', name: '英語コミュニケーション' },
  ];

  try {
    const existingLectures = db.select().from(schema.lectures).all();
    if (existingLectures.length === 0) {
      console.log('Seeding lectures...');
      db.insert(schema.lectures).values(lectures).run();
      console.log('Lectures seeded successfully.');
    }
  } catch (error) {
    console.error('Error seeding lectures:', error);
  }
}
seedLectures();


// --- Users ---
/**
 * Finds a user by their ID.
 * @param {string} id The user's ID.
 * @returns {object | undefined} The user object or undefined if not found.
 */
export function findUserById(id) {
  return db.query.users.findFirst({
    where: eq(schema.users.id, id),
  });
}

/**
 * Creates a new user in the database.
 * @param {string} id The user's ID (from LINE).
 * @param {string} displayName The user's display name.
 * @returns {object} The newly created user object.
 */
export function createUser(id, displayName) {
  const newUser = { id, displayName };
  db.insert(schema.users).values(newUser).run();
  return newUser;
}

// --- Lectures ---
/**
 * Retrieves all lectures from the database.
 * @returns {Array<object>} A list of all lectures.
 */
export function getLectures() {
  return db.query.lectures.findMany();
}

// --- Stamps ---
/**
 * Retrieves all stamps for a given user, including the associated lecture name.
 * @param {string} userId The user's ID.
 * @returns {Array<object>} A list of the user's stamps.
 */
export function getUserStampsWithLecture(userId) {
  return db.query.stamps.findMany({
    where: eq(schema.stamps.userId, userId),
    with: {
      lecture: {
        columns: {
          name: true,
        },
      },
    },
  });
}

/**
 * Adds or updates a stamp for a user on a specific date.
 * Uses an "upsert" operation: if a stamp exists for the user/date, it's updated;
 * otherwise, a new one is created.
 * @param {string} userId The user's ID.
 * @param {string} date The ISO date string (YYYY-MM-DD).
 * @param {string} lectureId The ID of the lecture to stamp.
 */
export function addStamp(userId, date, lectureId) {
  // Drizzle doesn't have a direct "upsert" for SQLite.
  // We use `onConflictDoUpdate` which is a common way to handle this.
  db.insert(schema.stamps)
    .values({ userId, date, lectureId })
    .onConflictDoUpdate({
      target: [schema.stamps.userId, schema.stamps.date],
      set: { lectureId: lectureId },
    })
    .run();
}


// --- Sessions ---
/**
 * Creates a new session record in the database.
 * @param {string} sessionId The unique session ID.
 * @param {string} userId The user's ID.
 * @param {Date} expiresAt The session's expiration date.
 */
export function createDbSession(sessionId, userId, expiresAt) {
  db.insert(schema.sessions).values({ id: sessionId, userId, expiresAt }).run();
}

/**
 * Retrieves a session from the database by its ID.
 * @param {string} sessionId The session ID.
 * @returns {object | undefined} The session object or undefined if not found.
 */
export function getDbSession(sessionId) {
  return db.query.sessions.findFirst({
    where: eq(schema.sessions.id, sessionId),
  });
}

/**
 * Deletes a session from the database.
 * @param {string} sessionId The ID of the session to delete.
 */
export function deleteDbSession(sessionId) {
  db.delete(schema.sessions).where(eq(schema.sessions.id, sessionId)).run();
}

/**
 * Deletes all expired sessions from the database.
 */
export function deleteExpiredSessions() {
    const now = new Date();
    db.delete(schema.sessions).where(eq(schema.sessions.expiresAt, now)).run();
}

// Periodically clean up expired sessions (e.g., every hour)
setInterval(deleteExpiredSessions, 60 * 60 * 1000);

// Graceful shutdown
process.on('exit', () => sqlite.close());
process.on('SIGHUP', () => process.exit(128 + 1));
process.on('SIGINT', () => process.exit(128 + 2));
process.on('SIGTERM', () => process.exit(128 + 15));
