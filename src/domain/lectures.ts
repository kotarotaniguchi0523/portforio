import { getLectures as dbGetLectures } from "../db/index.ts";

/**
 * Retrieves the list of all available lectures.
 * This function acts as a use case in the domain layer,
 * decoupling the web layer from the data access layer.
 * @returns {Array<{id: string, name: string}>} A list of lectures.
 */
export function getAvailableLectures(): { id: string; name: string }[] {
	// In a more complex application, this is where you might add
	// business logic, such as filtering, sorting, or combining data.
	// For now, it's a direct pass-through to the database layer.
	return dbGetLectures();
}
