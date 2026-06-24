import { describe, it, expect } from 'vitest'
import { nextVersion } from './e2eService'

// Rotation versioning: the next group-key version is always one above the
// current maximum, starting at 1 when none exists yet. This guards against
// version collisions across join/leave rotations (#11).
describe('nextVersion', () => {
  it('starts at 1 when no key exists (max 0)', () => {
    expect(nextVersion(0)).toBe(1)
  })

  it('increments above the current maximum', () => {
    expect(nextVersion(1)).toBe(2)
    expect(nextVersion(2)).toBe(3)
    expect(nextVersion(7)).toBe(8)
  })
})
