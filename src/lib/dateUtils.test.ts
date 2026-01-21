import { describe, it, expect } from 'vitest'
import {
  getLocalDateString,
  getLocalTimeString,
  getStartOfDay,
  getEndOfDay,
  parseLocalDate,
  getTodayRange,
  getYesterdayRange,
  getThisWeekRange,
  getLastWeekRange,
  getThisMonthRange,
  getLastMonthRange,
  formatDateRange,
  isToday,
  isYesterday,
} from './dateUtils'

describe('dateUtils', () => {
  describe('getLocalDateString', () => {
    it('should format date as YYYY-MM-DD', () => {
      const date = new Date(2025, 0, 15) // Jan 15, 2025
      expect(getLocalDateString(date)).toBe('2025-01-15')
    })

    it('should pad single digit months and days', () => {
      const date = new Date(2025, 0, 5) // Jan 5, 2025
      expect(getLocalDateString(date)).toBe('2025-01-05')
    })
  })

  describe('getLocalTimeString', () => {
    it('should format time as HH:MM', () => {
      const date = new Date(2025, 0, 15, 14, 30)
      expect(getLocalTimeString(date)).toBe('14:30')
    })

    it('should pad single digit hours and minutes', () => {
      const date = new Date(2025, 0, 15, 9, 5)
      expect(getLocalTimeString(date)).toBe('09:05')
    })
  })

  describe('getStartOfDay', () => {
    it('should return start of day timestamp', () => {
      const date = new Date(2025, 0, 15, 14, 30, 45, 123)
      const start = getStartOfDay(date)
      const startDate = new Date(start)

      expect(startDate.getFullYear()).toBe(2025)
      expect(startDate.getMonth()).toBe(0)
      expect(startDate.getDate()).toBe(15)
      expect(startDate.getHours()).toBe(0)
      expect(startDate.getMinutes()).toBe(0)
      expect(startDate.getSeconds()).toBe(0)
      expect(startDate.getMilliseconds()).toBe(0)
    })
  })

  describe('getEndOfDay', () => {
    it('should return end of day timestamp', () => {
      const date = new Date(2025, 0, 15, 14, 30)
      const end = getEndOfDay(date)
      const endDate = new Date(end)

      expect(endDate.getFullYear()).toBe(2025)
      expect(endDate.getMonth()).toBe(0)
      expect(endDate.getDate()).toBe(15)
      expect(endDate.getHours()).toBe(23)
      expect(endDate.getMinutes()).toBe(59)
      expect(endDate.getSeconds()).toBe(59)
      expect(endDate.getMilliseconds()).toBe(999)
    })
  })

  describe('parseLocalDate', () => {
    it('should parse YYYY-MM-DD string as local date', () => {
      const date = parseLocalDate('2025-01-15')
      expect(date.getFullYear()).toBe(2025)
      expect(date.getMonth()).toBe(0) // January = 0
      expect(date.getDate()).toBe(15)
    })
  })

  describe('getTodayRange', () => {
    it('should return range for today', () => {
      const now = new Date(2025, 0, 15, 14, 30) // Jan 15, 2025 at 2:30 PM
      const range = getTodayRange(now)

      expect(range.from).not.toBeNull()
      expect(range.to).not.toBeNull()
      const fromDate = new Date(range.from!)
      const toDate = new Date(range.to!)

      expect(fromDate.getDate()).toBe(15)
      expect(fromDate.getHours()).toBe(0)
      expect(fromDate.getMinutes()).toBe(0)

      expect(toDate.getDate()).toBe(15)
      expect(toDate.getHours()).toBe(23)
      expect(toDate.getMinutes()).toBe(59)
    })
  })

  describe('getYesterdayRange', () => {
    it('should return range for yesterday', () => {
      const now = new Date(2025, 0, 15, 14, 30) // Jan 15, 2025
      const range = getYesterdayRange(now)

      expect(range.from).not.toBeNull()
      expect(range.to).not.toBeNull()
      const fromDate = new Date(range.from!)
      const toDate = new Date(range.to!)

      expect(fromDate.getDate()).toBe(14)
      expect(fromDate.getHours()).toBe(0)

      expect(toDate.getDate()).toBe(14)
      expect(toDate.getHours()).toBe(23)
    })
  })

  describe('getThisWeekRange', () => {
    it('should return Monday to now for a Sunday (the bug case!)', () => {
      // Sunday, Jan 19, 2025 at 2:30 PM
      const sunday = new Date(2025, 0, 19, 14, 30)
      const range = getThisWeekRange(sunday)

      expect(range.from).not.toBeNull()
      expect(range.to).not.toBeNull()
      const fromDate = new Date(range.from!)
      const toDate = new Date(range.to!)

      // Should start on Monday, Jan 13 (NOT Jan 19!)
      expect(fromDate.getDay()).toBe(1) // Monday
      expect(fromDate.getDate()).toBe(13)
      expect(fromDate.getMonth()).toBe(0) // January
      expect(fromDate.getHours()).toBe(0)
      expect(fromDate.getMinutes()).toBe(0)

      // Should end at current moment (Sunday 2:30 PM)
      expect(toDate.getTime()).toBe(sunday.getTime())
    })

    it('should return Monday to now for a Monday', () => {
      const monday = new Date(2025, 0, 13, 14, 30) // Monday, Jan 13, 2025
      const range = getThisWeekRange(monday)

      expect(range.from).not.toBeNull()
      const fromDate = new Date(range.from!)

      // Should start on the same Monday
      expect(fromDate.getDay()).toBe(1)
      expect(fromDate.getDate()).toBe(13)
      expect(fromDate.getHours()).toBe(0)
    })

    it('should return Monday to now for a Tuesday', () => {
      const tuesday = new Date(2025, 0, 14, 14, 30) // Tuesday, Jan 14, 2025
      const range = getThisWeekRange(tuesday)

      expect(range.from).not.toBeNull()
      const fromDate = new Date(range.from!)

      // Should start on Monday, Jan 13
      expect(fromDate.getDay()).toBe(1)
      expect(fromDate.getDate()).toBe(13)
    })

    it('should return Monday to now for a Saturday', () => {
      const saturday = new Date(2025, 0, 18, 14, 30) // Saturday, Jan 18, 2025
      const range = getThisWeekRange(saturday)

      expect(range.from).not.toBeNull()
      const fromDate = new Date(range.from!)

      // Should start on Monday, Jan 13
      expect(fromDate.getDay()).toBe(1)
      expect(fromDate.getDate()).toBe(13)
    })
  })

  describe('getLastWeekRange', () => {
    it('should return last Monday to last Sunday', () => {
      const now = new Date(2025, 0, 15, 14, 30) // Wednesday, Jan 15, 2025
      const range = getLastWeekRange(now)

      expect(range.from).not.toBeNull()
      expect(range.to).not.toBeNull()
      const fromDate = new Date(range.from!)
      const toDate = new Date(range.to!)

      // Should start on Monday, Jan 6
      expect(fromDate.getDay()).toBe(1)
      expect(fromDate.getDate()).toBe(6)
      expect(fromDate.getHours()).toBe(0)

      // Should end on Sunday, Jan 12
      expect(toDate.getDay()).toBe(0)
      expect(toDate.getDate()).toBe(12)
      expect(toDate.getHours()).toBe(23)
      expect(toDate.getMinutes()).toBe(59)
    })

    it('should handle last week when current day is Sunday', () => {
      const sunday = new Date(2025, 0, 19, 14, 30) // Sunday, Jan 19, 2025
      const range = getLastWeekRange(sunday)

      expect(range.from).not.toBeNull()
      expect(range.to).not.toBeNull()
      const fromDate = new Date(range.from!)
      const toDate = new Date(range.to!)

      // Should start on Monday, Jan 6
      expect(fromDate.getDay()).toBe(1)
      expect(fromDate.getDate()).toBe(6)

      // Should end on Sunday, Jan 12
      expect(toDate.getDay()).toBe(0)
      expect(toDate.getDate()).toBe(12)
    })
  })

  describe('getThisMonthRange', () => {
    it('should return first of month to now', () => {
      const now = new Date(2025, 0, 15, 14, 30) // Jan 15, 2025
      const range = getThisMonthRange(now)

      expect(range.from).not.toBeNull()
      expect(range.to).not.toBeNull()
      const fromDate = new Date(range.from!)
      const toDate = new Date(range.to!)

      expect(fromDate.getDate()).toBe(1)
      expect(fromDate.getMonth()).toBe(0)
      expect(fromDate.getHours()).toBe(0)

      expect(toDate.getTime()).toBe(now.getTime())
    })
  })

  describe('getLastMonthRange', () => {
    it('should return full previous month', () => {
      const now = new Date(2025, 1, 15) // Feb 15, 2025
      const range = getLastMonthRange(now)

      expect(range.from).not.toBeNull()
      expect(range.to).not.toBeNull()
      const fromDate = new Date(range.from!)
      const toDate = new Date(range.to!)

      // Should be Jan 1 to Jan 31
      expect(fromDate.getMonth()).toBe(0) // January
      expect(fromDate.getDate()).toBe(1)
      expect(fromDate.getHours()).toBe(0)

      expect(toDate.getMonth()).toBe(0) // January
      expect(toDate.getDate()).toBe(31)
      expect(toDate.getHours()).toBe(23)
    })

    it('should handle February correctly', () => {
      const now = new Date(2025, 2, 15) // March 15, 2025
      const range = getLastMonthRange(now)

      expect(range.from).not.toBeNull()
      expect(range.to).not.toBeNull()
      const fromDate = new Date(range.from!)
      const toDate = new Date(range.to!)

      // Should be Feb 1 to Feb 28 (2025 is not a leap year)
      expect(fromDate.getMonth()).toBe(1) // February
      expect(fromDate.getDate()).toBe(1)

      expect(toDate.getMonth()).toBe(1) // February
      expect(toDate.getDate()).toBe(28)
    })

    it('should handle year boundary', () => {
      const now = new Date(2025, 0, 15) // Jan 15, 2025
      const range = getLastMonthRange(now)

      expect(range.from).not.toBeNull()
      expect(range.to).not.toBeNull()
      const fromDate = new Date(range.from!)
      const toDate = new Date(range.to!)

      // Should be Dec 1, 2024 to Dec 31, 2024
      expect(fromDate.getFullYear()).toBe(2024)
      expect(fromDate.getMonth()).toBe(11) // December
      expect(fromDate.getDate()).toBe(1)

      expect(toDate.getFullYear()).toBe(2024)
      expect(toDate.getMonth()).toBe(11) // December
      expect(toDate.getDate()).toBe(31)
    })
  })

  describe('formatDateRange', () => {
    it('should format single day range', () => {
      const date = new Date(2025, 0, 15)
      const from = getStartOfDay(date)
      const to = getEndOfDay(date)

      expect(formatDateRange(from, to)).toBe('Jan 15, 2025')
    })

    it('should format range within same year', () => {
      const from = new Date(2025, 0, 12).getTime()
      const to = new Date(2025, 0, 18).getTime()

      expect(formatDateRange(from, to)).toBe('Jan 12 - Jan 18')
    })

    it('should format range across months in same year', () => {
      const from = new Date(2025, 0, 25).getTime()
      const to = new Date(2025, 1, 5).getTime()

      expect(formatDateRange(from, to)).toBe('Jan 25 - Feb 5')
    })

    it('should format range across year boundary', () => {
      const from = new Date(2024, 11, 25).getTime()
      const to = new Date(2025, 0, 5).getTime()

      expect(formatDateRange(from, to)).toBe('Dec 25, 2024 - Jan 5, 2025')
    })
  })

  describe('isToday', () => {
    it('should return true for today range', () => {
      const now = new Date(2025, 0, 15, 14, 30)
      const range = getTodayRange(now)

      expect(isToday(range, now)).toBe(true)
    })

    it('should return false for yesterday range', () => {
      const now = new Date(2025, 0, 15, 14, 30)
      const range = getYesterdayRange(now)

      expect(isToday(range, now)).toBe(false)
    })
  })

  describe('isYesterday', () => {
    it('should return true for yesterday range', () => {
      const now = new Date(2025, 0, 15, 14, 30)
      const range = getYesterdayRange(now)

      expect(isYesterday(range, now)).toBe(true)
    })

    it('should return false for today range', () => {
      const now = new Date(2025, 0, 15, 14, 30)
      const range = getTodayRange(now)

      expect(isYesterday(range, now)).toBe(false)
    })
  })
})
