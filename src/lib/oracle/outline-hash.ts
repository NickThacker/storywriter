import { createHash } from 'crypto'

/**
 * Returns a SHA-256 hex digest of the outline JSON.
 * Used as a cache key — oracle output regenerates only when the outline changes.
 */
export function hashOutline(outline: unknown): string {
  return createHash('sha256')
    .update(JSON.stringify(outline))
    .digest('hex')
}
