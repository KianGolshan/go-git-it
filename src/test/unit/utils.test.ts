import * as assert from 'assert'
import { slugify, relativeDate, truncate, escapeHtml, getNonce } from '../../utils'

// ── slugify ──────────────────────────────────────────────────────────────────

describe('slugify', () => {
  it('lowercases input', () => {
    assert.strictEqual(slugify('Hello World'), 'hello-world')
  })

  it('replaces spaces with hyphens', () => {
    assert.strictEqual(slugify('my portfolio'), 'my-portfolio')
  })

  it('collapses multiple spaces/symbols into one hyphen', () => {
    assert.strictEqual(slugify('my   project!!!'), 'my-project')
  })

  it('strips leading and trailing hyphens', () => {
    assert.strictEqual(slugify('  --my project--  '), 'my-project')
  })

  it('handles special characters', () => {
    assert.strictEqual(slugify('Hello, World!'), 'hello-world')
  })

  it('handles numbers', () => {
    assert.strictEqual(slugify('Project 123'), 'project-123')
  })

  it('returns empty string for all-special input', () => {
    assert.strictEqual(slugify('!!!'), '')
  })

  it('handles single word', () => {
    assert.strictEqual(slugify('portfolio'), 'portfolio')
  })

  it('handles mixed case with numbers', () => {
    assert.strictEqual(slugify('My Recipe App 2'), 'my-recipe-app-2')
  })

  it('handles unicode letters by stripping them (non a-z0-9)', () => {
    // é, ñ etc. are stripped since they don't match [a-z0-9]
    assert.strictEqual(slugify('café'), 'caf')
  })
})

// ── truncate ─────────────────────────────────────────────────────────────────

describe('truncate', () => {
  it('returns short strings unchanged', () => {
    assert.strictEqual(truncate('hello'), 'hello')
  })

  it('truncates strings longer than default 34 chars', () => {
    const long = 'a'.repeat(40)
    const result = truncate(long)
    assert.strictEqual(result.length, 34)
    assert.ok(result.endsWith('…'))
  })

  it('truncates at custom length', () => {
    const result = truncate('hello world', 5)
    assert.strictEqual(result, 'hell…')
    assert.strictEqual(result.length, 5)
  })

  it('does not truncate exactly at limit', () => {
    const exactly34 = 'a'.repeat(34)
    assert.strictEqual(truncate(exactly34), exactly34)
  })

  it('handles empty string', () => {
    assert.strictEqual(truncate(''), '')
  })

  it('handles string of length 1 with limit 1', () => {
    assert.strictEqual(truncate('a', 1), 'a')
  })
})

// ── escapeHtml ────────────────────────────────────────────────────────────────

describe('escapeHtml', () => {
  it('escapes ampersands', () => {
    assert.strictEqual(escapeHtml('a & b'), 'a &amp; b')
  })

  it('escapes less-than', () => {
    assert.strictEqual(escapeHtml('<script>'), '&lt;script&gt;')
  })

  it('escapes greater-than', () => {
    assert.strictEqual(escapeHtml('a > b'), 'a &gt; b')
  })

  it('escapes double quotes', () => {
    assert.strictEqual(escapeHtml('"hello"'), '&quot;hello&quot;')
  })

  it('escapes all special chars together', () => {
    const raw = '<div class="a & b">'
    const escaped = escapeHtml(raw)
    assert.ok(!escaped.includes('<'))
    assert.ok(!escaped.includes('>'))
    assert.ok(!escaped.includes('"'))
    assert.ok(!escaped.includes(' & ') || escaped.includes('&amp;'))
  })

  it('leaves safe strings unchanged', () => {
    assert.strictEqual(escapeHtml('hello world'), 'hello world')
  })

  it('handles empty string', () => {
    assert.strictEqual(escapeHtml(''), '')
  })

  it('prevents XSS in commit messages', () => {
    const xss = '<img src=x onerror=alert(1)>'
    const escaped = escapeHtml(xss)
    assert.ok(!escaped.includes('<img'))
    assert.ok(escaped.includes('&lt;img'))
  })
})

// ── relativeDate ──────────────────────────────────────────────────────────────

describe('relativeDate', () => {
  it('returns "just now" for times less than 2 minutes ago', () => {
    const now = new Date(Date.now() - 30 * 1000).toISOString()
    assert.strictEqual(relativeDate(now), 'just now')
  })

  it('returns "just now" for exactly 1 minute ago', () => {
    const oneMin = new Date(Date.now() - 60 * 1000).toISOString()
    assert.strictEqual(relativeDate(oneMin), 'just now')
  })

  it('returns "Xm ago" for times under an hour', () => {
    const tenMins = new Date(Date.now() - 10 * 60 * 1000).toISOString()
    assert.strictEqual(relativeDate(tenMins), '10m ago')
  })

  it('returns "Xh ago" for times under 24 hours', () => {
    const threeHours = new Date(Date.now() - 3 * 3600 * 1000).toISOString()
    assert.strictEqual(relativeDate(threeHours), '3h ago')
  })

  it('returns "yesterday" for ~24h ago', () => {
    const yesterday = new Date(Date.now() - 25 * 3600 * 1000).toISOString()
    assert.strictEqual(relativeDate(yesterday), 'yesterday')
  })

  it('returns "Xd ago" for 2-6 days ago', () => {
    const threeDays = new Date(Date.now() - 3 * 86400 * 1000).toISOString()
    assert.strictEqual(relativeDate(threeDays), '3d ago')
  })

  it('returns a date string for older dates', () => {
    const longAgo = new Date(Date.now() - 10 * 86400 * 1000).toISOString()
    const result = relativeDate(longAgo)
    // Should be a locale date string like "3/1/2026", not a relative time
    assert.ok(!result.includes('ago'))
    assert.ok(result.length > 0)
  })

  it('returns empty string for invalid date', () => {
    assert.strictEqual(relativeDate('not-a-date'), '')
    assert.strictEqual(relativeDate(''), '')
  })
})

// ── getNonce ──────────────────────────────────────────────────────────────────

describe('getNonce', () => {
  it('returns a 32-character string', () => {
    const nonce = getNonce()
    assert.strictEqual(nonce.length, 32)
  })

  it('contains only alphanumeric characters', () => {
    const nonce = getNonce()
    assert.ok(/^[A-Za-z0-9]+$/.test(nonce))
  })

  it('generates unique values each call', () => {
    const nonces = new Set(Array.from({ length: 100 }, () => getNonce()))
    assert.strictEqual(nonces.size, 100)
  })
})
