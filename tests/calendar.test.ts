import { describe, it, expect } from 'vitest'
import { getMonthDates } from '../src/domain/calendar.ts'

// Helper to count non-null dates
function countDates(arr: Array<Date | null>): number {
  return arr.filter(Boolean).length
}

// biome-ignore lint/nursery/noSecrets: test description is not a secret
describe('getMonthDates', () => {
  it('generates 31 days for January 2025 with correct blanks', () => {
    const dates = getMonthDates(2025, 0) // January 2025
    expect(dates.length % 7).toBe(0)
    expect(countDates(dates)).toBe(31)
    expect(dates.slice(0, 3)).toEqual([null, null, null])

    const firstDate = dates[3]
    expect(firstDate?.getDate()).toBe(1)
    expect(firstDate?.getMonth()).toBe(0) // Should be January
    expect(firstDate?.getFullYear()).toBe(2025)

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

  describe('invalid inputs', () => {
    it('handles month index > 11 by rolling over to the next year', () => {
      // `new Date(2025, 12, 1)` is the same as `new Date(2026, 0, 1)`
      const dates = getMonthDates(2025, 12)
      const firstDate = dates.find(Boolean)
      expect(firstDate?.getFullYear()).toBe(2026)
      expect(firstDate?.getMonth()).toBe(0) // January
    })

    it('handles negative month index by rolling back to previous year', () => {
      // `new Date(2025, -1, 1)` is the same as `new Date(2024, 11, 1)`
      const dates = getMonthDates(2025, -1)
      const firstDate = dates.find(Boolean)
      expect(firstDate?.getFullYear()).toBe(2024)
      expect(firstDate?.getMonth()).toBe(11) // December
    })
  })
})
