import {
	findUserById,
	createUser,
	getUserStampsWithLecture,
	addStamp as dbAddStamp,
	createDbSession,
	getDbSession,
	deleteDbSession,
} from "../db/index.ts";
import { nanoid } from "nanoid";
import type { SessionData, Stamp } from "./types.ts";
import { insertStampSchema } from "../db/schema.ts";

const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Creates a new persistent session for a given user ID.
 * @param {string} userId - The user's persistent ID from the database.
 * @returns {string} The new session ID.
 */
export function createSession(userId: string): string {
	const sessionId = nanoid();
	const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
	createDbSession(sessionId, userId, expiresAt);
	return sessionId;
}

/**
 * Retrieves user and stamp data based on a session ID.
 * @param {string} sessionId - The ID of the session.
 * @returns {{user: object, stamps: Array<object>}|undefined}
 */
export function getSessionData(sessionId: string): SessionData | undefined {
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
	const stamps: Stamp[] = rawStamps.map((stamp) => ({
		date: stamp.date,
		lectureName: stamp.lectureName,
		iconUrl: stamp.iconUrl,
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
export function deleteSession(sessionId: string): void {
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
export function findOrCreateUser(
	id: string,
	displayName: string,
): { id: string; displayName: string } {
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
export function addStamp(
        userId: string,
        date: string,
        lectureId: string,
): void {
        insertStampSchema.parse({ userId, date, lectureId });
        dbAddStamp(userId, date, lectureId);
}

/**
 * Adds a stamp based on a session ID and returns the updated session data.
 * This aggregates the logic of resolving the user from the session, inserting
 * the stamp and reloading session information so that web handlers remain
 * lean.
 *
 * @param {string} sessionId - The current session ID.
 * @param {string} date - ISO date string (YYYY-MM-DD).
 * @param {string} lectureId - The lecture to associate with the stamp.
 * @returns {SessionData | undefined} Updated session data or undefined if the session is invalid.
 */
export function addStampForSession(
        sessionId: string,
        date: string,
        lectureId: string,
): SessionData | undefined {
        const userId = getUserIdFromSession(sessionId);
        if (!userId) {
                return undefined;
        }
        insertStampSchema.parse({ userId, date, lectureId });
        dbAddStamp(userId, date, lectureId);
        return getSessionData(sessionId);
}

/**
 * Gets the user ID associated with a session.
 * @param {string} sessionId - The session ID.
 * @returns {string | undefined} The user ID or undefined.
 */
export function getUserIdFromSession(sessionId: string): string | undefined {
	const session = getDbSession(sessionId);
	// Also check expiration here for safety
	if (!session || new Date() > session.expiresAt) {
		return undefined;
	}
	return session.userId;
}
