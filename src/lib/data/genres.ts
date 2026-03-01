export interface CardOption {
  id: string
  label: string
  description: string
  icon: string
}

export const GENRES: CardOption[] = [
  {
    id: 'fantasy',
    label: 'Fantasy',
    description: 'Magic systems, mythical creatures, epic quests',
    icon: 'Sword',
  },
  {
    id: 'romance',
    label: 'Romance',
    description: 'Love stories, relationships, emotional journeys',
    icon: 'Heart',
  },
  {
    id: 'thriller',
    label: 'Thriller',
    description: 'Suspense, danger, high-stakes tension',
    icon: 'Zap',
  },
  {
    id: 'sci-fi',
    label: 'Science Fiction',
    description: 'Future tech, space, alternate realities',
    icon: 'Rocket',
  },
  {
    id: 'literary',
    label: 'Literary Fiction',
    description: 'Character-driven, thematic depth, prose craft',
    icon: 'BookOpen',
  },
]
