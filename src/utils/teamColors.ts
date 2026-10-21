// Colors that tell teams apart, led by the cyan accent. Mid-tones so they
// read on both the light and dark themes.
const TEAM_COLORS = [
  '#12B8D6', // cyan
  '#0F8F86', // teal
  '#F0644B', // coral
  '#4F5BD5', // indigo
  '#E09620', // amber
  '#C2417F', // magenta
  '#3A9D4F', // green
  '#2E6F9E', // harbor blue
];

export const getTeamColor = (teamIndex: number): string =>
  TEAM_COLORS[teamIndex % TEAM_COLORS.length];
