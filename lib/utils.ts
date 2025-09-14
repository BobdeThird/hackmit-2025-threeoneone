import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Wilson score lower bound for a Bernoulli parameter (success probability).
 * Returns a conservative estimate of positive ratio given total votes.
 */
function wilsonLowerBound(positive: number, total: number, z: number = 1.2815515655446004): number {
  const pos = Math.max(0, positive)
  const n = Math.max(0, total)
  if (n === 0) return 0
  const pHat = pos / n
  const z2 = z * z
  const denom = 1 + z2 / n
  const center = (pHat + (z2 / (2 * n))) / denom
  const margin = (z * Math.sqrt((pHat * (1 - pHat) + (z2 / (4 * n))) / n)) / denom
  return Math.max(0, center - margin)
}

/**
 * Compute an exponential time-decay factor using a half-life model.
 * A half-life of H hours yields factor = 0.5^(hoursSince/H).
 */
function timeDecayFactor(createdAt: string, halfLifeHours: number): number {
  const createdMs = new Date(createdAt).getTime()
  if (!isFinite(createdMs)) return 0
  const hoursSince = Math.max(0, (Date.now() - createdMs) / (1000 * 60 * 60))
  return Math.pow(2, -(hoursSince / Math.max(1e-6, halfLifeHours)))
}

/**
 * Compute a "hotness" score combining quality (Wilson lower bound), magnitude,
 * net sentiment (up - down), and recency via exponential decay.
 *
 * - Quality: Wilson lower bound of positive ratio
 * - Magnitude: log10(1 + total votes)
 * - Net: atan(net/5) scaled to [-1, 1] to avoid domination
 * - Recency: half-life decay (default 8h)
 */
export function computeHotScore(
  upvotes: number,
  downvotes: number,
  createdAt: string,
  options?: { halfLifeHours?: number }
): number {
  const up = Math.max(0, upvotes | 0)
  const down = Math.max(0, downvotes | 0)
  const total = up + down

  const halfLifeHours = options?.halfLifeHours ?? 8

  const quality = wilsonLowerBound(up, total)
  const magnitude = Math.log10(1 + total)
  const net = up - down
  const netComponent = Math.atan(net / 5) / (Math.PI / 2) // [-1, 1]
  const recency = timeDecayFactor(createdAt, halfLifeHours)

  const base = quality + 0.35 * magnitude + 0.25 * netComponent
  return base * recency
}
