import { describe, it, expect } from 'vitest'
import {
  formatRelativeTime,
  formatWaitTime,
  getUrgencyLevel,
  getUrgencyClasses,
  formatTimestamp,
  formatMediaType,
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
  })

  it('returns hours for < 24 hours', () => {
    expect(formatRelativeTime(3600)).toBe('1h ago')
    expect(formatRelativeTime(7200)).toBe('2h ago')
  })

  it('returns days for < 7 days', () => {
    expect(formatRelativeTime(86400)).toBe('1d ago')
  })

  it('returns weeks for >= 7 days', () => {
    expect(formatRelativeTime(86400 * 7)).toBe('1w ago')
  })
})

describe('formatWaitTime', () => {
  it('returns minutes for < 1 hour', () => {
    expect(formatWaitTime(0)).toBe('0m')
    expect(formatWaitTime(1800)).toBe('30m')
  })

  it('returns hours for < 24 hours', () => {
    expect(formatWaitTime(3600)).toBe('1h')
  })

  it('returns days for >= 24 hours', () => {
    expect(formatWaitTime(86400)).toBe('1d')
  })
})

describe('getUrgencyLevel', () => {
  it('returns "normal" for < 24 hours', () => {
    expect(getUrgencyLevel(0)).toBe('normal')
    expect(getUrgencyLevel(3600)).toBe('normal')
    expect(getUrgencyLevel(86399)).toBe('normal')
  })

  it('returns "urgent" for >= 24 hours', () => {
    expect(getUrgencyLevel(86400)).toBe('urgent')
    expect(getUrgencyLevel(172800)).toBe('urgent')
  })
})

describe('getUrgencyClasses', () => {
  it('returns amber classes for normal', () => {
    expect(getUrgencyClasses(0)).toContain('amber')
  })

  it('returns coral classes for urgent', () => {
    expect(getUrgencyClasses(100000)).toContain('coral')
  })
})

describe('formatTimestamp', () => {
  it('formats a unix timestamp', () => {
    const result = formatTimestamp(1711036800)
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })
})

describe('formatMediaType', () => {
  it('returns readable names for known types', () => {
    expect(formatMediaType('image')).toBe('Photo')
    expect(formatMediaType('video')).toBe('Video')
    expect(formatMediaType('audio')).toBe('Audio')
    expect(formatMediaType('ptt')).toBe('Voice message')
    expect(formatMediaType('document')).toBe('Document')
    expect(formatMediaType('sticker')).toBe('Sticker')
  })

  it('returns empty string for chat type', () => {
    expect(formatMediaType('chat')).toBe('')
  })

  it('returns the raw type for unknown types', () => {
    expect(formatMediaType('unknown_type')).toBe('unknown_type')
  })
})
