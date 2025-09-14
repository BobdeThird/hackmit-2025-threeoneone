import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
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

  const halfLifeHours = options?.halfLifeHours ?? 8

  // Upvotes dominate everything - recency is almost irrelevant
  const recency = timeDecayFactor(createdAt, halfLifeHours)
  
  // Each upvote is worth 100 points - massive dominance
  const upvoteScore = up * 100
  
  // Downvotes reduce score but don't eliminate upvote advantage
  const downvotePenalty = down * 20
  
  const base = upvoteScore - downvotePenalty
  
  // If post has upvotes, recency barely matters (stays 90%+ relevant forever)
  // If no upvotes, recency still matters but capped very low
  const finalRecency = up > 0 ? Math.max(0.9, recency) : Math.min(0.5, recency)
  
  return base + finalRecency
}
