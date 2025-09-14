export interface UserVote {
  postId: string
  voteType: "up" | "down" | null
  timestamp: number
}

export interface PostVoteData {
  upvotes: number
  downvotes: number
  userVote: "up" | "down" | null
}

const STORAGE_KEY = "threeonetone_user_votes"

/**
 * Get all user votes from localStorage
 */
export function getUserVotes(): Map<string, UserVote> {
  if (typeof window === "undefined") {
    return new Map()
  }
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return new Map()
    
    const votesArray: UserVote[] = JSON.parse(stored)
    const votesMap = new Map<string, UserVote>()
    
    votesArray.forEach(vote => {
      votesMap.set(vote.postId, vote)
    })
    
    return votesMap
  } catch (error) {
    console.error("Error loading user votes:", error)
    return new Map()
  }
}

/**
 * Save user votes to localStorage
 */
export function saveUserVotes(votes: Map<string, UserVote>): void {
  if (typeof window === "undefined") return
  
  try {
    const votesArray = Array.from(votes.values())
    localStorage.setItem(STORAGE_KEY, JSON.stringify(votesArray))
  } catch (error) {
    console.error("Error saving user votes:", error)
  }
}

/**
 * Get user's vote for a specific post
 */
export function getUserVoteForPost(postId: string): "up" | "down" | null {
  const votes = getUserVotes()
  const userVote = votes.get(postId)
  return userVote?.voteType || null
}

/**
 * Update user's vote for a specific post
 */
export function updateUserVote(postId: string, voteType: "up" | "down" | null): void {
  const votes = getUserVotes()
  
  if (voteType === null) {
    votes.delete(postId)
  } else {
    votes.set(postId, {
      postId,
      voteType,
      timestamp: Date.now()
    })
  }
  
  saveUserVotes(votes)
}

/**
 * Calculate vote counts for a post including user votes from all users
 * This would normally come from a backend, but for demo purposes we'll simulate it
 */
export function calculatePostVoteData(
  postId: string,
  originalUpvotes: number,
  originalDownvotes: number,
  originalUserVote: "up" | "down" | null
): PostVoteData {
  const userVote = getUserVoteForPost(postId)
  
  let upvotes = originalUpvotes
  let downvotes = originalDownvotes
  
  // Remove original user vote if it existed
  if (originalUserVote === "up") {
    upvotes -= 1
  } else if (originalUserVote === "down") {
    downvotes -= 1
  }
  
  // Add current user vote
  if (userVote === "up") {
    upvotes += 1
  } else if (userVote === "down") {
    downvotes += 1
  }
  
  return {
    upvotes: Math.max(0, upvotes), // Ensure non-negative
    downvotes: Math.max(0, downvotes), // Ensure non-negative
    userVote
  }
}

/**
 * Handle vote change for a post
 */
export function handleVoteChange(
  postId: string,
  newVoteType: "up" | "down",
  currentUserVote: "up" | "down" | null
): "up" | "down" | null {
  let finalVoteType: "up" | "down" | null = newVoteType
  
  // If clicking the same vote type, remove the vote
  if (currentUserVote === newVoteType) {
    finalVoteType = null
  }
  
  updateUserVote(postId, finalVoteType)
  return finalVoteType
}
