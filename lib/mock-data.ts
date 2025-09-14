import type { Post } from "./types"

export const mockPosts: Post[] = [
  {
    id: "1",
    description:
      "There's a dangerous pothole near the intersection of Market and 5th Street that's been growing larger over the past few weeks. It's causing damage to vehicles and creating a safety hazard for cyclists.",
    location: "Market St & 5th St",
    city: "SF",
    imageUrl: "public/pothole-on-city-street.jpg",
    upvotes: 24,
    downvotes: 2,
    userVote: null,
    createdAt: "2024-01-15T10:30:00Z",
    comments: [
      {
        id: "1",
        author: "Sarah M.",
        content: "I hit this pothole yesterday and it damaged my tire. The city needs to fix this ASAP!",
        createdAt: "2024-01-15T14:20:00Z",
      },
      {
        id: "2",
        author: "Mike R.",
        content: "I've reported this to 311 three times already. Still no action.",
        createdAt: "2024-01-15T16:45:00Z",
      },
    ],
  },
  {
    id: "2",
    description:
      "The streetlight at the corner of Mission and 3rd has been out for over a week. This area gets pretty dark at night and it's making residents feel unsafe.",
    location: "Mission St & 3rd St",
    city: "SF",
    upvotes: 18,
    downvotes: 0,
    userVote: "up",
    createdAt: "2024-01-14T08:15:00Z",
    comments: [
      {
        id: "3",
        author: "Jennifer L.",
        content: "I walk through here every night after work. Please fix this soon!",
        createdAt: "2024-01-14T20:30:00Z",
      },
    ],
  },
  {
    id: "3",
    description:
      "Someone tagged the side of the old post office building on Union Square. This is a historic landmark and should be cleaned up quickly.",
    location: "Union Square",
    city: "SF",
    imageUrl: "public/graffiti-on-historic-building.jpg",
    upvotes: 12,
    downvotes: 5,
    userVote: null,
    createdAt: "2024-01-13T15:45:00Z",
    comments: [],
  },
  {
    id: "4",
    description:
      "The 14th Street Union Square station has been flooding every time it rains heavily. Water pools near the platform edge, creating slippery conditions.",
    location: "14th St Union Square Station",
    city: "NYC",
    upvotes: 31,
    downvotes: 1,
    userVote: null,
    createdAt: "2024-01-12T09:20:00Z",
    comments: [
      {
        id: "4",
        author: "David K.",
        content: "I slipped here last week. This is a serious safety issue.",
        createdAt: "2024-01-12T11:30:00Z",
      },
      {
        id: "5",
        author: "Maria S.",
        content: "The MTA needs to address this before someone gets seriously hurt.",
        createdAt: "2024-01-12T13:15:00Z",
      },
    ],
  },
  {
    id: "5",
    description:
      "The traffic light at Broadway and 42nd Street has been stuck on red for the cross street, causing major traffic backups during rush hour.",
    location: "Broadway & 42nd St",
    city: "NYC",
    upvotes: 45,
    downvotes: 3,
    userVote: "up",
    createdAt: "2024-01-11T07:30:00Z",
    comments: [
      {
        id: "6",
        author: "Robert T.",
        content: "This has been going on for three days now. My commute has doubled in time.",
        createdAt: "2024-01-11T08:45:00Z",
      },
    ],
  },
  {
    id: "6",
    description:
      "The sidewalk on Commonwealth Avenue near the Public Garden has several large cracks and uneven sections that are difficult for wheelchair users and people with mobility issues.",
    location: "Commonwealth Ave near Public Garden",
    city: "Boston",
    upvotes: 22,
    downvotes: 1,
    userVote: null,
    createdAt: "2024-01-10T14:20:00Z",
    comments: [
      {
        id: "7",
        author: "Lisa W.",
        content: "As someone who uses a wheelchair, this stretch is nearly impossible to navigate safely.",
        createdAt: "2024-01-10T16:30:00Z",
      },
      {
        id: "8",
        author: "Tom H.",
        content: "I've seen several people trip here. The city should prioritize accessibility.",
        createdAt: "2024-01-10T18:15:00Z",
      },
    ],
  },
  {
    id: "7",
    description:
      "The trash bins near the pond in Boston Common have been overflowing for days. It's attracting pests and creating an unpleasant smell for visitors.",
    location: "Boston Common - Near Pond",
    city: "Boston",
    imageUrl: "public/overflowing-trash-bins-in-park.jpg",
    upvotes: 28,
    downvotes: 2,
    userVote: null,
    createdAt: "2024-01-09T11:45:00Z",
    comments: [
      {
        id: "9",
        author: "Amanda R.",
        content: "I bring my kids here to play and it's really disappointing to see it in this condition.",
        createdAt: "2024-01-09T13:20:00Z",
      },
    ],
  },
]
