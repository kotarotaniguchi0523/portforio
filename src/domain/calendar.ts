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
  const dates: (Date | null)[] = []
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  // Fill initial blanks for days before the first
  for (let i = 0; i < firstDay.getDay(); i++) {
    dates.push(null)
  }
  // Actual dates
  for (let d = 1; d <= lastDay.getDate(); d++) {
    dates.push(new Date(year, month, d))
  }
  // Fill trailing blanks until the length is divisible by 7
  while (dates.length % 7 !== 0) {
    dates.push(null)
  }
  return dates
}
