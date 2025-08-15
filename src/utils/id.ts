import { nanoid } from "nanoid";

/**
 * Generate a random ID using nanoid. Accepts optional size to control length.
 */
export const generateId = (size?: number): string => (size ? nanoid(size) : nanoid());
