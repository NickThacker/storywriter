export interface Beat {
  id: string
  name: string
  description: string
  act: 1 | 2 | 3
  positionPercent: number
}

export interface BeatSheet {
  id: string
  name: string
  description: string
  beats: Beat[]
}

export const BEAT_SHEETS: BeatSheet[] = [
  {
    id: 'save-the-cat',
    name: 'Save the Cat',
    description: 'Blake Snyder\'s 15-beat structure for commercially satisfying stories',
    beats: [
      { id: 'opening-image', name: 'Opening Image', description: 'A snapshot of the hero\'s world before the adventure begins', act: 1, positionPercent: 1 },
      { id: 'theme-stated', name: 'Theme Stated', description: 'The thematic premise is stated, often by a secondary character', act: 1, positionPercent: 5 },
      { id: 'set-up', name: 'Set-Up', description: 'Introduce the hero, their world, and establish what needs fixing', act: 1, positionPercent: 10 },
      { id: 'catalyst', name: 'Catalyst', description: 'The inciting incident that disrupts the hero\'s status quo', act: 1, positionPercent: 12 },
      { id: 'debate', name: 'Debate', description: 'The hero questions whether to accept the call to adventure', act: 1, positionPercent: 20 },
      { id: 'break-into-two', name: 'Break Into Two', description: 'The hero makes a choice and enters the new world of Act 2', act: 2, positionPercent: 25 },
      { id: 'b-story', name: 'B Story', description: 'A secondary story (often a relationship) that carries the theme', act: 2, positionPercent: 30 },
      { id: 'fun-and-games', name: 'Fun and Games', description: 'The promise of the premise; the hero explores the new world', act: 2, positionPercent: 40 },
      { id: 'midpoint', name: 'Midpoint', description: 'A false victory or false defeat that raises the stakes', act: 2, positionPercent: 50 },
      { id: 'bad-guys-close-in', name: 'Bad Guys Close In', description: 'The hero\'s team falls apart and antagonistic forces close in', act: 2, positionPercent: 60 },
      { id: 'all-is-lost', name: 'All Is Lost', description: 'The hero\'s lowest point; feels defeated and hopeless', act: 2, positionPercent: 75 },
      { id: 'dark-night', name: 'Dark Night of the Soul', description: 'The hero sits in their worst failure and despair', act: 2, positionPercent: 80 },
      { id: 'break-into-three', name: 'Break Into Three', description: 'A-story and B-story combine to give the hero the solution', act: 3, positionPercent: 85 },
      { id: 'finale', name: 'Finale', description: 'The hero executes the solution and defeats the antagonist', act: 3, positionPercent: 95 },
      { id: 'final-image', name: 'Final Image', description: 'A mirror of the opening image showing how much the hero has changed', act: 3, positionPercent: 99 },
    ],
  },
  {
    id: 'three-act',
    name: 'Three-Act Structure',
    description: 'The classical story structure used in drama, film, and fiction for centuries',
    beats: [
      { id: 'act-1-setup', name: 'Act 1 Setup', description: 'Establish the protagonist, their world, and the status quo', act: 1, positionPercent: 5 },
      { id: 'inciting-incident', name: 'Inciting Incident', description: 'The event that disrupts the protagonist\'s life and sets the story in motion', act: 1, positionPercent: 15 },
      { id: 'first-plot-point', name: 'First Plot Point', description: 'The protagonist commits to the story goal; the adventure truly begins', act: 1, positionPercent: 25 },
      { id: 'midpoint-shift', name: 'Midpoint Shift', description: 'A major revelation or reversal that changes the protagonist\'s approach', act: 2, positionPercent: 50 },
      { id: 'second-plot-point', name: 'Second Plot Point', description: 'The darkest moment before the final push; protagonist hits rock bottom', act: 2, positionPercent: 75 },
      { id: 'climax', name: 'Climax', description: 'The decisive confrontation where the central conflict is resolved', act: 3, positionPercent: 90 },
      { id: 'resolution', name: 'Resolution', description: 'The aftermath showing the protagonist\'s changed world', act: 3, positionPercent: 98 },
    ],
  },
  {
    id: 'heros-journey',
    name: "Hero's Journey",
    description: "Joseph Campbell's monomyth — the universal pattern found in myths across cultures",
    beats: [
      { id: 'ordinary-world', name: 'Ordinary World', description: "The hero's normal life before the adventure begins", act: 1, positionPercent: 4 },
      { id: 'call-to-adventure', name: 'Call to Adventure', description: 'The hero is confronted with a challenge or quest', act: 1, positionPercent: 12 },
      { id: 'refusal-of-call', name: 'Refusal of the Call', description: 'The hero initially hesitates or refuses the challenge', act: 1, positionPercent: 18 },
      { id: 'meeting-mentor', name: 'Meeting the Mentor', description: 'The hero encounters a wise figure who provides guidance or gifts', act: 1, positionPercent: 22 },
      { id: 'crossing-threshold', name: 'Crossing the Threshold', description: 'The hero commits to the adventure and enters the special world', act: 2, positionPercent: 27 },
      { id: 'tests-allies-enemies', name: 'Tests, Allies, and Enemies', description: 'The hero faces challenges, makes friends, and meets foes', act: 2, positionPercent: 40 },
      { id: 'approach', name: 'Approach', description: 'The hero prepares for the central ordeal', act: 2, positionPercent: 55 },
      { id: 'ordeal', name: 'Ordeal', description: 'The hero faces their greatest challenge and near-death experience', act: 2, positionPercent: 65 },
      { id: 'reward', name: 'Reward', description: 'The hero seizes the prize after surviving the ordeal', act: 2, positionPercent: 74 },
      { id: 'road-back', name: 'The Road Back', description: 'The hero begins the journey home, facing new dangers', act: 3, positionPercent: 82 },
      { id: 'resurrection', name: 'Resurrection', description: 'The hero faces a final test and is reborn, transformed', act: 3, positionPercent: 90 },
      { id: 'return-with-elixir', name: 'Return with Elixir', description: 'The hero returns home with wisdom, treasure, or healing', act: 3, positionPercent: 98 },
    ],
  },
  {
    id: 'romancing-the-beat',
    name: 'Romancing the Beat',
    description: "Gwen Hayes' 8-beat structure designed specifically for romance novels",
    beats: [
      { id: 'setup', name: 'Setup', description: 'Establish both protagonists\' worlds and their emotional wounds', act: 1, positionPercent: 5 },
      { id: 'meet-cute', name: 'Meets Cute', description: 'The two protagonists encounter each other in a memorable, charged way', act: 1, positionPercent: 15 },
      { id: 'no-way', name: 'No Way', description: 'Both characters resist the attraction — reasons why this cannot work', act: 1, positionPercent: 25 },
      { id: 'maybe-first-kiss', name: 'Maybe / First Kiss', description: 'The first crack in resistance; a charged moment or first physical connection', act: 2, positionPercent: 40 },
      { id: 'midpoint-swoon', name: 'Midpoint Swoon', description: 'The relationship deepens; both feel the pull toward love', act: 2, positionPercent: 55 },
      { id: 'retreat', name: 'Retreat', description: 'Fear of vulnerability drives one or both characters away', act: 2, positionPercent: 70 },
      { id: 'grand-gesture', name: 'Grand Gesture / Dark Moment', description: 'The lowest point — the relationship seems lost — before the redemptive grand gesture', act: 3, positionPercent: 85 },
      { id: 'happily-ever-after', name: 'Happily Ever After', description: 'The romantic resolution — love declared, future secured', act: 3, positionPercent: 97 },
    ],
  },
]

export function getBeatSheetById(id: string): BeatSheet | undefined {
  return BEAT_SHEETS.find((sheet) => sheet.id === id)
}
