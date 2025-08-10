import { describe, it, expect } from 'vitest'
import { getMonthDates } from '../src/domain/calendar.js'

// Helper to count non-null dates
function countDates(arr) {
  return arr.filter(Boolean).length
}

describe('getMonthDates', () => {
  it('generates 31 days for January 2025 with correct blanks', () => {
    const dates = getMonthDates(2025, 0) // January 2025 starts on Wednesday
    expect(dates.length % 7).toBe(0)
    expect(countDates(dates)).toBe(31)
    expect(dates.slice(0, 3)).toEqual([null, null, null])
    expect(dates[3]?.getDate()).toBe(1)
    expect(dates[dates.length - 1]).toBeNull()
  })

  it('handles leap year February 2024', () => {
    const dates = getMonthDates(2024, 1)
    expect(countDates(dates)).toBe(29)
    expect(dates.length).toBe(35) // 4 blanks + 29 days + 2 blanks
    expect(dates[4]?.getDate()).toBe(1)
  })

  it('month starting on Sunday has no leading blanks', () => {
    const dates = getMonthDates(2024, 8) // September 2024 starts Sunday
    expect(dates[0]).not.toBeNull()
    expect(dates[0]?.getDate()).toBe(1)
    // 30 days + 5 trailing blanks = 35 cells
    expect(dates.length).toBe(35)
  })

  it('month starting on Saturday fills trailing blanks to 42', () => {
    const dates = getMonthDates(2025, 2) // March 2025 starts Saturday and has 31 days
    expect(dates.slice(0, 6)).toEqual([null, null, null, null, null, null])
    expect(dates[6]?.getDate()).toBe(1)
    expect(dates.length).toBe(42)
    expect(dates.slice(-5)).toEqual([null, null, null, null, null])
  })
})
