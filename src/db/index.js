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
export function findUserById(id) {
  return db.query.users.findFirst({
    where: eq(schema.users.id, id),
  });
}

export function createUser(id, displayName) {
  const newUser = { id, displayName };
  db.insert(schema.users).values(newUser).run();
  return newUser;
}

// --- Lectures ---
export function getLectures() {
  return db.query.lectures.findMany();
}

// --- Stamps ---
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
export function createDbSession(sessionId, userId, expiresAt) {
  db.insert(schema.sessions).values({ id: sessionId, userId, expiresAt }).run();
}

export function getDbSession(sessionId) {
  return db.query.sessions.findFirst({
    where: eq(schema.sessions.id, sessionId),
  });
}

export function deleteDbSession(sessionId) {
  db.delete(schema.sessions).where(eq(schema.sessions.id, sessionId)).run();
}

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
