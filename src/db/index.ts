import "dotenv/config";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { env } from "std-env";
import exitHook from "exit-hook";
import * as schema from "./schema.ts";
import { eq, lt } from "drizzle-orm";

type User = { id: string; displayName: string };
type Lecture = { id: string; name: string };
type Session = { id: string; userId: string; expiresAt: Date };

const sqlite = new Database(env.DATABASE_URL);
export const db = drizzle(sqlite, { schema });

// --- Seeding ---
// Seed the database with initial lecture data if it's empty.
export function seedLectures(): void {
	const lectures = [
		{
			id: "math",
			name: "微分積分学",
			iconUrl: "https://placehold.co/32x32/3498db/ffffff?text=M",
		},
		{
			id: "science",
			name: "量子力学",
			iconUrl: "https://placehold.co/32x32/2ecc71/ffffff?text=S",
		},
		{
			id: "history",
			name: "世界史",
			iconUrl: "https://placehold.co/32x32/e67e22/ffffff?text=H",
		},
		{
			id: "english",
			name: "英語コミュニケーション",
			iconUrl: "https://placehold.co/32x32/e74c3c/ffffff?text=E",
		},
	];

	try {
		const existingLectures = db.select().from(schema.lectures).all();
		if (existingLectures.length === 0) {
			console.log("Seeding lectures...");
			db.insert(schema.lectures).values(lectures).run();
			console.log("Lectures seeded successfully.");
		} else if (existingLectures.some((l) => !l.iconUrl)) {
			console.log("Updating existing lectures with icon URLs...");
			for (const lecture of lectures) {
				db.update(schema.lectures)
					.set({ iconUrl: lecture.iconUrl })
					.where(eq(schema.lectures.id, lecture.id))
					.run();
			}
			console.log("Icon URLs updated for existing lectures.");
		}
	} catch (error) {
		console.error("Error seeding lectures:", error);
		throw error;
	}
}

// --- Users ---
/**
 * Finds a user by their ID.
 * @param {string} id The user's ID.
 * @returns {object | undefined} The user object or undefined if not found.
 */
export function findUserById(id: string): User | undefined {
	return db.select().from(schema.users).where(eq(schema.users.id, id)).get();
}

/**
 * Creates a new user in the database.
 * @param {string} id The user's ID (from LINE).
 * @param {string} displayName The user's display name.
 * @returns {object} The newly created user object.
 */
export function createUser(id: string, displayName: string): User {
	const newUser: User = { id, displayName };
	db.insert(schema.users).values(newUser).run();
	return newUser;
}

// --- Lectures ---
/**
 * Retrieves all lectures from the database.
 * @returns {Array<object>} A list of all lectures.
 */
export function getLectures(): Lecture[] {
	return db.select().from(schema.lectures).all();
}

// --- Stamps ---
/**
 * Retrieves all stamps for a given user, including the associated lecture name.
 * @param {string} userId The user's ID.
 * @returns {Array<object>} A list of the user's stamps.
 */
export function getUserStampsWithLecture(
	userId: string,
): Array<{
	date: string;
	lectureId: string;
	lectureName: string | null;
	iconUrl: string | null;
}> {
	return db
		.select({
			date: schema.stamps.date,
			lectureId: schema.stamps.lectureId,
			lectureName: schema.lectures.name,
			iconUrl: schema.lectures.iconUrl,
		})
		.from(schema.stamps)
		.leftJoin(schema.lectures, eq(schema.stamps.lectureId, schema.lectures.id))
		.where(eq(schema.stamps.userId, userId))
		.all();
}

/**
 * Adds or updates a stamp for a user on a specific date.
 * Uses an "upsert" operation: if a stamp exists for the user/date, it's updated;
 * otherwise, a new one is created.
 * @param {string} userId The user's ID.
 * @param {string} date The ISO date string (YYYY-MM-DD).
 * @param {string} lectureId The ID of the lecture to stamp.
 */
export function addStamp(
	userId: string,
	date: string,
	lectureId: string,
): void {
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
export function createDbSession(
	sessionId: string,
	userId: string,
	expiresAt: Date,
): void {
	db.insert(schema.sessions).values({ id: sessionId, userId, expiresAt }).run();
}

/**
 * Retrieves a session from the database by its ID.
 * @param {string} sessionId The session ID.
 * @returns {object | undefined} The session object or undefined if not found.
 */
export function getDbSession(sessionId: string): Session | undefined {
	return db
		.select()
		.from(schema.sessions)
		.where(eq(schema.sessions.id, sessionId))
		.get();
}

/**
 * Deletes a session from the database.
 * @param {string} sessionId The ID of the session to delete.
 */
export function deleteDbSession(sessionId: string): void {
	db.delete(schema.sessions).where(eq(schema.sessions.id, sessionId)).run();
}

/**
 * Deletes all expired sessions from the database.
 */
export function deleteExpiredSessions(): void {
        const now = new Date();
        db.delete(schema.sessions)
                .where(lt(schema.sessions.expiresAt, now))
                .run();
}

// Periodically clean up expired sessions (e.g., every hour)
setInterval(deleteExpiredSessions, 60 * 60 * 1000);

// Graceful shutdown
exitHook(() => sqlite.close());
