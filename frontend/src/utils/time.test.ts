import { describe, it, expect } from 'vitest'
import {
  formatRelativeTime,
  formatWaitTime,
  getUrgencyLevel,
  getUrgencyClasses,
  formatTimestamp,
} from './time'

describe('formatRelativeTime', () => {
  it('returns "just now" for < 60 seconds', () => {
    expect(formatRelativeTime(0)).toBe('just now')
    expect(formatRelativeTime(30)).toBe('just now')
    expect(formatRelativeTime(59)).toBe('just now')
  })

  it('returns minutes for < 60 minutes', () => {
    expect(formatRelativeTime(60)).toBe('1m ago')
    expect(formatRelativeTime(120)).toBe('2m ago')
    expect(formatRelativeTime(3599)).toBe('59m ago')
  })

  it('returns hours for < 24 hours', () => {
    expect(formatRelativeTime(3600)).toBe('1h ago')
    expect(formatRelativeTime(7200)).toBe('2h ago')
    expect(formatRelativeTime(86399)).toBe('23h ago')
  })

  it('returns days for < 7 days', () => {
    expect(formatRelativeTime(86400)).toBe('1d ago')
    expect(formatRelativeTime(86400 * 6)).toBe('6d ago')
  })

  it('returns weeks for >= 7 days', () => {
    expect(formatRelativeTime(86400 * 7)).toBe('1w ago')
    expect(formatRelativeTime(86400 * 14)).toBe('2w ago')
  })
})

describe('formatWaitTime', () => {
  it('returns minutes for < 1 hour', () => {
    expect(formatWaitTime(0)).toBe('0m')
    expect(formatWaitTime(1800)).toBe('30m')
  })

  it('returns hours for < 24 hours', () => {
    expect(formatWaitTime(3600)).toBe('1h')
    expect(formatWaitTime(7200)).toBe('2h')
  })

  it('returns days for >= 24 hours', () => {
    expect(formatWaitTime(86400)).toBe('1d')
    expect(formatWaitTime(172800)).toBe('2d')
  })
})

describe('getUrgencyLevel', () => {
  it('returns "fresh" for < 1 hour', () => {
    expect(getUrgencyLevel(0)).toBe('fresh')
    expect(getUrgencyLevel(3599)).toBe('fresh')
  })

  it('returns "warm" for 1-4 hours', () => {
    expect(getUrgencyLevel(3600)).toBe('warm')
    expect(getUrgencyLevel(14399)).toBe('warm')
  })

  it('returns "hot" for 4-24 hours', () => {
    expect(getUrgencyLevel(14400)).toBe('hot')
    expect(getUrgencyLevel(86399)).toBe('hot')
  })

  it('returns "critical" for > 24 hours', () => {
    expect(getUrgencyLevel(86400)).toBe('critical')
    expect(getUrgencyLevel(172800)).toBe('critical')
  })
})

describe('getUrgencyClasses', () => {
  it('returns sage classes for fresh', () => {
    expect(getUrgencyClasses(0)).toContain('sage')
  })

  it('returns amber classes for warm', () => {
    expect(getUrgencyClasses(7200)).toContain('amber')
  })

  it('returns coral classes for hot', () => {
    expect(getUrgencyClasses(50000)).toContain('coral')
  })

  it('returns coral classes for critical', () => {
    expect(getUrgencyClasses(100000)).toContain('coral')
  })
})

describe('formatTimestamp', () => {
  it('formats a unix timestamp into a readable date', () => {
    const result = formatTimestamp(1711036800) // 2024-03-21
    expect(result).toBeTruthy()
    expect(typeof result).toBe('string')
  })
})
