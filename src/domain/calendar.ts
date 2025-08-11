/**
 * Generate an array of dates and blanks for the specified month. Blank
 * values are represented with null so the client knows to render an
 * empty cell. The grid always starts on Sunday and ends on Saturday.
 *
 * @param {number} year Four‑digit year (e.g. 2025)
 * @param {number} month Zero‑based month (January = 0)
 * @returns {(Date|null)[]} An array of Date objects or nulls
 */
export function getMonthDates(year: number, month: number): (Date | null)[] {
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        const leadingNulls = Array.from({ length: firstDay.getDay() }, () => null);
        const days = Array.from({ length: lastDay.getDate() }, (_, d) =>
                new Date(year, month, d + 1),
        );
        const totalCells = Math.ceil((leadingNulls.length + days.length) / 7) * 7;
        const trailingNulls = Array.from(
                { length: totalCells - (leadingNulls.length + days.length) },
                () => null,
        );

        return [...leadingNulls, ...days, ...trailingNulls];
}

/**
 * Convenience helper that returns the year, month and calendar grid for the
 * current month. This consolidates the repeated logic of creating a `Date`
 * object, extracting the year/month and generating the grid with
 * {@link getMonthDates}.
 */
export function getCurrentMonth(): {
        year: number;
        month: number;
        dates: (Date | null)[];
} {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        return {
                year,
                month,
                dates: getMonthDates(year, month),
        };
}
