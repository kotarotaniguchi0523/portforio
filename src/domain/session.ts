import {
	findUserById,
	createUser,
	getUserStampsWithLecture,
	addStamp as dbAddStamp,
	createDbSession,
	getDbSession,
	deleteDbSession,
} from "../db/index.ts";
import { generateId } from "../utils/id.ts";
import type { SessionData, Stamp } from "./types.ts";
import { insertStampSchema, type sessions } from "../db/schema.ts";
import type { InferSelectModel } from "drizzle-orm";
import {
	ok,
	fail,
	type Result,
	DomainError,
	NotFoundError,
} from "../lib/result.ts";

type Session = InferSelectModel<typeof sessions>;

const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Creates a new persistent session for a given user ID.
 * @param {string} userId - The user's persistent ID from the database.
 * @returns {string} The new session ID.
 */
export function createSession(userId: string): string {
        const sessionId = generateId();
	const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
	createDbSession(sessionId, userId, expiresAt);
	return sessionId;
}

/**
 * Retrieves user and stamp data based on a session ID.
 * @param {string} sessionId - The ID of the session.
 * @returns {{user: object, stamps: Array<object>}|undefined}
 */
export function getSessionData(
        sessionId: string,
        existingSession?: Session,
): SessionData | undefined {
        const session = existingSession ?? getValidSession(sessionId);
        if (!session) {
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
 * @returns {Result<SessionData, NotFoundError | DomainError>} Updated session data or an error.
 */
export function addStampForSession(
	sessionId: string,
	date: string,
	lectureId: string,
): Result<SessionData, NotFoundError | DomainError> {
	const session = getValidSession(sessionId);
	if (!session) {
		return fail(new NotFoundError("Session not found or has expired."));
	}
	const { userId } = session;

	try {
		// The `insertStampSchema` is now validated at the route level by zValidator.
		// We can keep a check here as a defense-in-depth measure, but it's optional.
		// For this refactor, we assume the input is valid if it reaches this point.
		dbAddStamp(userId, date, lectureId);
	} catch (error) {
		console.error("Failed to add stamp to database:", error);
		// Check if the error is a SQLite unique constraint violation.
		// The specific error object structure depends on the database driver (better-sqlite3).
		if (error && typeof error === "object" && "code" in error && error.code === "SQLITE_CONSTRAINT_UNIQUE") {
			return fail(
				new DomainError(
					"Failed to add stamp, it might already exist for this date.",
				),
			);
		}
		// For any other type of error, re-throw it to be caught by the global
		// error handler, which will classify it as a 500 Internal Server Error.
		throw error;
	}

	// Pass the existing session object to avoid a second DB query
	const updatedSessionData = getSessionData(sessionId, session);
	if (!updatedSessionData) {
		// This case is unlikely if the session was valid just before, but handle it.
		return fail(new NotFoundError("Failed to reload session data after update."));
	}

	return ok(updatedSessionData);
}

/**
 * Gets the session object if it exists and is not expired.
 * @param {string} sessionId - The session ID.
 * @returns {Session | undefined} The session object or undefined.
 */
export function getValidSession(sessionId: string): Session | undefined {
        const session = getDbSession(sessionId);
        if (!session) {
                return undefined;
        }
        if (new Date() > session.expiresAt) {
                deleteDbSession(sessionId);
                return undefined;
        }
        return session;
}
