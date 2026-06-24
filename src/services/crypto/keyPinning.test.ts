import { describe, it, expect, beforeEach } from 'vitest'
import { tofuDecision, keyPinning } from './keyPinning'

describe('tofuDecision (pure TOFU state machine)', () => {
  it('returns first-use when nothing is pinned', () => {
    expect(tofuDecision(null, 'KEY_A')).toBe('first-use')
  })

  it('returns match when the incoming key equals the pin', () => {
    expect(tofuDecision('KEY_A', 'KEY_A')).toBe('match')
  })

  it('returns mismatch when the key changed', () => {
    expect(tofuDecision('KEY_A', 'KEY_B')).toBe('mismatch')
  })
})

describe('keyPinning store', () => {
  beforeEach(() => keyPinning.clearAll())

  it('pins on first use and matches thereafter', () => {
    expect(keyPinning.checkAndPin('u1', 'KEY_A')).toBe('first-use')
    expect(keyPinning.getPinned('u1')).toBe('KEY_A')
    expect(keyPinning.checkAndPin('u1', 'KEY_A')).toBe('match')
  })

  it('reports a changed key as mismatch WITHOUT overwriting the pin', () => {
    keyPinning.checkAndPin('u1', 'KEY_A')
    expect(keyPinning.checkAndPin('u1', 'KEY_B')).toBe('mismatch')
    // Pin must stay at the originally trusted key until explicitly accepted.
    expect(keyPinning.getPinned('u1')).toBe('KEY_A')
  })

  it('accepts a changed key only on explicit acceptKey', () => {
    keyPinning.checkAndPin('u1', 'KEY_A')
    keyPinning.acceptKey('u1', 'KEY_B')
    expect(keyPinning.getPinned('u1')).toBe('KEY_B')
    expect(keyPinning.checkAndPin('u1', 'KEY_B')).toBe('match')
  })

  it('keeps pins independent per user', () => {
    keyPinning.checkAndPin('u1', 'KEY_A')
    expect(keyPinning.checkAndPin('u2', 'KEY_B')).toBe('first-use')
    expect(keyPinning.getPinned('u1')).toBe('KEY_A')
  })
})
