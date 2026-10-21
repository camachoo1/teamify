import {
  Player,
  SkillCategory,
  Team,
  AppStore,
  HistoryEntry,
  TeamValidation,
} from '../types';

/**
 * Calculates the optimal number of teams based on player count and constraints.
 * If maxTeams is specified, it will be used unless it would result in teams
 * that are too large given the teamSize constraint.
 *
 * @param activePlayerCount - number of active players (does not include reserves)
 * @param teamSize - desired max teams size per team
 * @param maxTeams - max number of teams that need to be created (if 0 - no limit)
 * @returns Optimal number of teams to create
 */
export const calculateOptimalTeamCount = (
  activePlayerCount: number,
  teamSize: number,
  maxTeams: number
): number => {
  let numTeams: number;

  if (maxTeams > 0) {
    numTeams = maxTeams;
    const minTeamsNeeded = Math.ceil(activePlayerCount / teamSize);

    if (numTeams > minTeamsNeeded) {
      console.warn(
        `Reducing teams from ${numTeams} to ${minTeamsNeeded} based on player count`
      );
      numTeams = minTeamsNeeded;
    }
  } else {
    numTeams = Math.ceil(activePlayerCount / teamSize);
  }

  return numTeams;
};

/**
 * Returns a uniformly shuffled copy of an array (Fisher-Yates).
 *
 * @param items - Array to shuffle (not modified)
 * @returns New array with the same items in random order
 */
export const shuffle = <T>(items: T[]): T[] => {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

/**
 * Brings team rosters and the master player list back in sync.
 * Team rosters hold copies of players, so this refreshes each copy from
 * the master list, drops players that were removed or moved to reserves,
 * removes duplicates, and recomputes every player's teamId (team index).
 *
 * @param players - Master player list
 * @param teams - Teams whose rosters may be stale
 * @returns Synced players and teams
 */
export const syncPlayersAndTeams = (
  players: Player[],
  teams: Team[]
): { players: Player[]; teams: Team[] } => {
  const playersById = new Map(players.map((p) => [p.id, p]));
  const seen = new Set<number>();

  const syncedTeams = teams.map((team, index) => ({
    ...team,
    players: team.players.flatMap((teamPlayer) => {
      const current = playersById.get(teamPlayer.id);
      if (!current || current.isReserve || seen.has(teamPlayer.id)) {
        return [];
      }
      seen.add(teamPlayer.id);
      return [{ ...current, teamId: index }];
    }),
  }));

  return {
    teams: syncedTeams,
    players: updatePlayerTeamAssignments(players, syncedTeams),
  };
};

/**
 * Groups players by their skill levels for balanced distribution.
 * Players without a (known) skill level are placed in an 'unassigned' group.
 * Locked players are excluded from the grouping and shuffling.
 *
 * @param players - Array of players to group by skill level
 * @param skillCategories - Available skill categories to group by
 * @returns Object mapping skill category IDs to arrays of shuffled players
 */
export const groupPlayersBySkill = (
  players: Player[],
  skillCategories: SkillCategory[]
): { [key: string]: Player[] } => {
  const skillGroups: { [key: string]: Player[] } = {};

  skillCategories.forEach((category) => {
    skillGroups[category.id] = shuffle(
      players.filter((p) => p.skillLevel === category.id && !p.locked)
    );
  });

  const knownCategoryIds = new Set(skillCategories.map((c) => c.id));
  skillGroups['unassigned'] = shuffle(
    players.filter(
      (p) =>
        !p.locked &&
        (!p.skillLevel || !knownCategoryIds.has(p.skillLevel))
    )
  );

  return skillGroups;
};

/**
 * Adjusts team count based on composition rules constraints.
 * Ensures there are enough players in each skill category to meet
 * the minimum requirements defined in the composition rules.
 *
 * @param rules - Team composition rules mapping category IDs to required counts
 * @param skillGroups - Players grouped by skill categories
 * @param currentTeamCount - The initially calculated team count
 * @param maxTeams - Maximum allowed teams (0 means no limit)
 * @returns Adjusted team count that satisfies composition constraints
 */
export const adjustTeamCountForRules = (
  rules: { [categoryId: string]: number },
  skillGroups: { [key: string]: Player[] },
  currentTeamCount: number,
  maxTeams: number
): number => {
  if (Object.keys(rules).length === 0 || maxTeams === 0) {
    return currentTeamCount;
  }

  const maxTeamsPerCategory = Object.entries(rules)
    .map(([categoryId, count]) => {
      const availablePlayers = skillGroups[categoryId]?.length || 0;
      return count > 0
        ? Math.floor(availablePlayers / count)
        : Infinity;
    })
    .filter((count) => count !== Infinity);

  if (maxTeamsPerCategory.length > 0) {
    const calculatedTeams = Math.min(...maxTeamsPerCategory);
    if (calculatedTeams < currentTeamCount) {
      return Math.max(1, calculatedTeams);
    }
  }

  return currentTeamCount;
};

/**
 * Creates empty team structure with sequential IDs and default names.
 *
 * @param numTeams - Number of empty teams to create
 * @returns Array of empty teams with unique IDs and default names
 */
export const createEmptyTeams = (numTeams: number): Team[] => {
  return Array.from({ length: numTeams }, (_, i) => ({
    id: Date.now() + i,
    name: `Team ${i + 1}`,
    players: [],
  }));
};

/**
 * Distributes players according to composition rules.
 * First applies required counts per skill category, then fills
 * remaining spots with any leftover players.
 *
 * @param teams - Array of teams to populate with players
 * @param rules - Composition rules specifying required players per category
 * @param skillGroups - Players grouped by skill categories
 */
export const distributePlayersByRules = (
  teams: Team[],
  rules: { [categoryId: string]: number },
  skillGroups: { [key: string]: Player[] }
): void => {
  Object.entries(rules).forEach(([categoryId, requiredCount]) => {
    if (requiredCount > 0 && skillGroups[categoryId]) {
      const playersInCategory = skillGroups[categoryId];

      // Round-robin so a scarce category is spread across teams
      // instead of filling the first teams' quotas completely
      for (
        let round = 0;
        round < requiredCount && playersInCategory.length > 0;
        round++
      ) {
        for (
          let teamIndex = 0;
          teamIndex < teams.length && playersInCategory.length > 0;
          teamIndex++
        ) {
          const player = playersInCategory.shift()!;
          teams[teamIndex].players.push({
            ...player,
            teamId: teamIndex,
          });
        }
      }
    }
  });

  // Fill remaining spots with any remaining players
  addPlayersToLeastFilledTeams(teams, Object.values(skillGroups).flat());
};

/**
 * Distributes players evenly across teams without specific rules.
 * Uses round-robin distribution to ensure balanced team sizes.
 *
 * @param teams - Array of teams to populate with players
 * @param skillGroups - Players grouped by skill categories
 */
export const distributePlayersEvenly = (
  teams: Team[],
  skillGroups: { [key: string]: Player[] }
): void => {
  // Continue the rotation across groups so team sizes stay balanced
  let nextTeam = 0;
  Object.values(skillGroups).forEach((skillGroup) => {
    skillGroup.forEach((player) => {
      const teamIndex = nextTeam % teams.length;
      teams[teamIndex].players.push({
        ...player,
        teamId: teamIndex,
      });
      nextTeam++;
    });
  });
};

/**
 * Adds each player to the team with the fewest players. Because the
 * least-filled team is always chosen, teams only grow past the team size
 * once every team is full, and then they grow evenly (the same overflow
 * behavior as a full randomization).
 *
 * @param teams - Array of teams to populate (may already have players)
 * @param players - Players to add, in placement order
 */
export const addPlayersToLeastFilledTeams = (
  teams: Team[],
  players: Player[]
): void => {
  if (teams.length === 0) return;
  players.forEach((player) => {
    const teamIndex = teams.reduce(
      (minIdx, team, idx) =>
        team.players.length < teams[minIdx].players.length
          ? idx
          : minIdx,
      0
    );
    teams[teamIndex].players.push({ ...player, teamId: teamIndex });
  });
};

/**
 * Adds locked players to their appropriate teams.
 * Places players in their assigned team if valid, otherwise adds them to the least-filled team.
 *
 * @param teams - Array of teams to add locked players to
 * @param lockedPlayers - Players that are locked to specific teams
 */
export const addLockedPlayers = (
  teams: Team[],
  lockedPlayers: Player[]
): void => {
  lockedPlayers.forEach((player) => {
    if (player.teamId !== null && player.teamId < teams.length) {
      teams[player.teamId].players.push(player);
    } else {
      addPlayersToLeastFilledTeams(teams, [player]);
    }
  });
};

// Type for the subset of AppStore state needed for randomization
type RandomizationState = Pick<
  AppStore,
  'teamCompositionRules' | 'maxTeams' | 'skillCategories'
>;

/**
 * Performs skill-balanced team randomization.
 * Groups players by skill level and distributes them according to
 * composition rules or evenly if no rules are specified.
 *
 * @param activePlayers - Non-reserve players to assign to teams
 * @param numTeams - Number of teams to create
 * @param state - Application state containing skill categories and rules
 * @returns Array of teams with players assigned based on skill balancing
 */
export const performSkillBalancedRandomization = (
  activePlayers: Player[],
  numTeams: number,
  state: RandomizationState
): Team[] => {
  const rules = state.teamCompositionRules;
  const hasRules = Object.keys(rules).length > 0;

  const skillGroups = groupPlayersBySkill(
    activePlayers,
    state.skillCategories
  );

  const adjustedTeamCount = adjustTeamCountForRules(
    rules,
    skillGroups,
    numTeams,
    state.maxTeams
  );

  const newTeams = createEmptyTeams(adjustedTeamCount);

  if (hasRules) {
    distributePlayersByRules(newTeams, rules, skillGroups);
  } else {
    distributePlayersEvenly(newTeams, skillGroups);
  }

  const lockedActivePlayers = activePlayers.filter((p) => p.locked);
  addLockedPlayers(newTeams, lockedActivePlayers);

  return newTeams;
};

/**
 * Performs standard randomization without skill balancing.
 * Shuffles unlocked players and distributes them evenly across teams,
 * while preserving locked players in their assigned positions.
 *
 * @param activePlayers - Non-reserve players to assign to teams
 * @param numTeams - Number of teams to create
 * @returns Array of teams with randomly distributed players
 */
export const performStandardRandomization = (
  activePlayers: Player[],
  numTeams: number
): Team[] => {
  const unlockedActivePlayers = activePlayers.filter(
    (p) => !p.locked
  );
  const lockedActivePlayers = activePlayers.filter((p) => p.locked);
  const playersToPlace = [...unlockedActivePlayers];

  const newTeams = createEmptyTeams(numTeams);

  lockedActivePlayers.forEach((player) => {
    if (player.teamId !== null && player.teamId < numTeams) {
      newTeams[player.teamId].players.push(player);
    } else {
      // No valid team to stay on: place like an unlocked player
      playersToPlace.push(player);
    }
  });

  // Distribute unlocked players evenly
  addPlayersToLeastFilledTeams(newTeams, shuffle(playersToPlace));

  return newTeams;
};

/**
 * Applies custom team naming based on skill categories.
 * Names teams after players from the specified skill category,
 * falling back to default names if no matching player is found.
 *
 * @param teams - Array of teams to apply naming to
 * @param teamNamingCategoryId - Skill category ID to use for naming
 * @param allPlayers - Complete player list for skill level lookup
 * @param shouldRename - Optional filter; teams it rejects keep their name
 * @returns Array of teams with updated names
 */
export const applyCustomTeamNaming = (
  teams: Team[],
  teamNamingCategoryId: string | null,
  allPlayers: Player[],
  shouldRename: (team: Team, index: number) => boolean = () => true
): Team[] => {
  if (!teamNamingCategoryId) {
    return teams;
  }

  return teams.map((team, index) => {
    if (!shouldRename(team, index)) return team;

    const namingPlayer = team.players.find((player) => {
      const playerData = allPlayers.find((p) => p.id === player.id);
      return playerData?.skillLevel === teamNamingCategoryId;
    });

    return {
      ...team,
      name: namingPlayer
        ? `Team ${namingPlayer.name}`
        : `Team ${index + 1}`,
    };
  });
};

/**
 * Updates player team assignments based on final team composition.
 * Reserve players are kept unassigned, while active players are
 * assigned to their respective teams.
 *
 * @param allPlayers - Complete list of players to update
 * @param finalTeams - Final team assignments after randomization
 * @returns Updated player list with correct team assignments
 */
export const updatePlayerTeamAssignments = (
  allPlayers: Player[],
  finalTeams: Team[]
): Player[] => {
  return allPlayers.map((player) => {
    if (player.isReserve) {
      return { ...player, teamId: null };
    }

    const team = finalTeams.find((t) =>
      t.players.some((p) => p.id === player.id)
    );
    return {
      ...player,
      teamId: team ? finalTeams.indexOf(team) : null,
    };
  });
};

/**
 * Creates a history entry for the team randomization.
 * Captures the current state including players, teams, event info and
 * team settings for later retrieval and replay.
 *
 * @param updatedPlayers - Player list with updated team assignments
 * @param finalTeams - Final team composition after randomization
 * @param settings - Event info and team settings to save with the entry
 * @returns History entry object with timestamp and deep-copied data
 */
export const createHistoryEntry = (
  updatedPlayers: Player[],
  finalTeams: Team[],
  settings: HistorySettings
): HistoryEntry => {
  return {
    id: Date.now(),
    timestamp: new Date().toISOString(),
    players: updatedPlayers,
    teams: JSON.parse(JSON.stringify(finalTeams)),
    eventName: settings.eventName,
    organizerName: settings.organizerName,
    maxTeams: settings.maxTeams,
    teamSize: settings.teamSize,
    reservePlayersEnabled: settings.reservePlayersEnabled,
    skillBalancingEnabled: settings.skillBalancingEnabled,
    skillCategories: settings.skillCategories,
    teamCompositionRules: settings.teamCompositionRules,
    teamNamingCategoryId: settings.teamNamingCategoryId,
  };
};

type HistorySettings = Pick<
  AppStore,
  | 'eventName'
  | 'organizerName'
  | 'maxTeams'
  | 'teamSize'
  | 'reservePlayersEnabled'
  | 'skillBalancingEnabled'
  | 'skillCategories'
  | 'teamCompositionRules'
  | 'teamNamingCategoryId'
>;

/**
 * Validates team composition against skill balancing rules.
 * Checks if each team meets the required number of players per skill category
 * and identifies any violations or imbalances.
 *
 * @param team - The team to validate
 * @param players - Complete list of players for skill level lookup
 * @param skillCategories - Available skill categories with names and colors
 * @param teamCompositionRules - Required number of players per skill category
 * @param skillBalancingEnabled - Whether skill balancing validation is active
 * @returns Validation result with status, violations, and skill distribution
 */
export const validateTeamComposition = (
  team: Team,
  players: Player[],
  skillCategories: SkillCategory[],
  teamCompositionRules: { [categoryId: string]: number },
  skillBalancingEnabled: boolean
): TeamValidation => {
  const result: TeamValidation = {
    isValid: true,
    violations: [],
    skillDistribution: {},
  };

  // Skip validation if skill balancing is disabled or no rules set
  if (
    !skillBalancingEnabled ||
    Object.keys(teamCompositionRules).length === 0
  ) {
    return result;
  }

  const teamPlayerData = team.players
    .map((p) => players.find((player) => player.id === p.id))
    .filter(Boolean) as Player[];

  Object.entries(teamCompositionRules).forEach(
    ([categoryId, requiredCount]) => {
      if (requiredCount > 0) {
        const categoryPlayers = teamPlayerData.filter(
          (p) => p.skillLevel === categoryId
        );
        const actualCount = categoryPlayers.length;
        const categoryName =
          skillCategories.find((c) => c.id === categoryId)?.name ||
          categoryId;

        result.skillDistribution[categoryId] = {
          actual: actualCount,
          required: requiredCount,
          categoryName,
        };

        if (actualCount < requiredCount) {
          result.violations.push(
            `Needs ${
              requiredCount - actualCount
            } more ${categoryName} player(s)`
          );
          result.isValid = false;
        } else if (actualCount > requiredCount) {
          result.violations.push(
            `Has ${
              actualCount - requiredCount
            } too many ${categoryName} player(s)`
          );
          result.isValid = false;
        }
      }
    }
  );

  return result;
};

type TeamState = Pick<AppStore, 'players' | 'teams' | 'teamSize'>;

/**
 * Distributes players according to composition rules while considering existing team assignments.
 * Calculates deficits for each team and fills them using round-robin distribution to ensure
 * balanced skill allocation across all teams. Prioritizes teams with the greatest need.
 *
 * @param teams - Array of teams to populate with players (may already contain some players)
 * @param rules - Composition rules specifying required players per skill category
 * @param skillGroups - Players grouped by skill categories, available for assignment
 * @param state - Application state containing team size limits and player data
 */
export const distributePlayersByRulesWithDeficits = (
  teams: Team[],
  rules: { [categoryId: string]: number },
  skillGroups: { [key: string]: Player[] },
  state: TeamState
): void => {
  Object.entries(rules).forEach(([categoryId, requiredCount]) => {
    if (
      requiredCount > 0 &&
      skillGroups[categoryId] &&
      skillGroups[categoryId].length > 0
    ) {
      const playersInCategory = [...skillGroups[categoryId]];

      const teamDeficits = teams.map((team, index) => {
        const currentCount = team.players.filter((p) => {
          const playerData = state.players!.find(
            (pd) => pd.id === p.id
          );
          return playerData?.skillLevel === categoryId;
        }).length;

        const deficit = Math.max(0, requiredCount - currentCount);
        const hasSpace = team.players.length < state.teamSize;

        return {
          teamIndex: index,
          deficit,
          currentCount,
          hasSpace,
          teamName: team.name,
        };
      });

      let round = 0;
      while (playersInCategory.length > 0 && round < requiredCount) {
        let assignedThisRound = false;

        teamDeficits.forEach((teamInfo) => {
          if (
            playersInCategory.length > 0 &&
            teamInfo.deficit > round &&
            teamInfo.hasSpace &&
            teams[teamInfo.teamIndex].players.length < state.teamSize
          ) {
            const player = playersInCategory.shift()!;
            teams[teamInfo.teamIndex].players.push({
              ...player,
              teamId: teamInfo.teamIndex,
            });

            // Update space tracking
            teamInfo.hasSpace =
              teams[teamInfo.teamIndex].players.length <
              state.teamSize;
            assignedThisRound = true;
          }
        });

        if (!assignedThisRound) break;
        round++;
      }

      // Remove assigned players from the skill group
      skillGroups[categoryId] = playersInCategory;
    }
  });

  addPlayersToLeastFilledTeams(teams, Object.values(skillGroups).flat());
};

/**
 * Adds locked players to teams while respecting team size limits.
 * Attempts to place players in their preferred team if it has space,
 * otherwise adds them to the least-filled team.
 *
 * @param teams - Array of teams to add locked players to
 * @param lockedPlayers - Players that are locked and need team assignment
 * @param teamSize - Maximum number of players allowed per team
 */
export const addLockedPlayersToPartialTeams = (
  teams: Team[],
  lockedPlayers: Player[],
  teamSize: number
): void => {
  lockedPlayers.forEach((player) => {
    if (
      player.teamId !== null &&
      player.teamId < teams.length &&
      teams[player.teamId].players.length < teamSize
    ) {
      teams[player.teamId].players.push({ ...player });
    } else {
      addPlayersToLeastFilledTeams(teams, [player]);
    }
  });
};
