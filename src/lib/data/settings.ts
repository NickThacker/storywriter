import type { CardOption } from './genres'

export const SETTINGS: CardOption[] = [
  {
    id: 'urban-modern',
    label: 'Urban / Modern',
    description: 'Cities, contemporary life, technology',
    icon: 'Building',
  },
  {
    id: 'historical',
    label: 'Historical',
    description: 'Past eras, period detail, real-world anchors',
    icon: 'Clock',
  },
  {
    id: 'secondary-world',
    label: 'Secondary World',
    description: 'Entirely invented world with its own rules',
    icon: 'Globe2',
  },
  {
    id: 'rural',
    label: 'Rural / Small Town',
    description: 'Countryside, community, isolation',
    icon: 'Trees',
  },
  {
    id: 'space',
    label: 'Space / Off-World',
    description: 'Stations, ships, alien landscapes',
    icon: 'Orbit',
  },
]
