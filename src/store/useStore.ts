import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  AppStore,
  Team,
  ExportData,
  SkillCategory,
  Player,
} from '../types';
import {
  performSkillBalancedRandomization,
  performStandardRandomization,
  applyCustomTeamNaming,
  syncPlayersAndTeams,
  shuffle,
  createHistoryEntry,
  calculateOptimalTeamCount,
  addPlayersToLeastFilledTeams,
  groupPlayersBySkill,
  addLockedPlayersToPartialTeams,
  distributePlayersByRulesWithDeficits,
} from '../utils/helper';
import {
  createTournament,
  recordResult,
  clearResult,
  startBracketStage,
} from '../tournament/engine';

// Default skill categories
const defaultSkillCategories: SkillCategory[] = [
  { id: 'amateur', name: 'Amateur', color: '#10B981' },
  { id: 'intermediate', name: 'Intermediate', color: '#3B82F6' },
  { id: 'advanced', name: 'Advanced', color: '#8B5CF6' },
  { id: 'expert', name: 'Expert', color: '#EF4444' },
];

/**
 * Hook for initializing a Zustand store that persists throughout.
 *
 * Manages global state such as event/organizer name, players, teams,
 * team sizes, team configuration history, skill categories, and UI data such as dark mode.
 *
 * Also, creates actions for manipulating global state such as adding or removing
 * players, team assignments, randomizing teams based on players, and storing
 * historical team creation data with retrieval.
 *
 * @returns { AppStore } - zustand store object with state and actions for managing said state
 */
const useStore = create<AppStore>()(
  persist(
    (set, get) => ({
      // Initial State
      eventName: '',
      organizerName: '',
      players: [],
      teams: [],
      teamSize: 1,
      history: [],
      darkMode: true,
      skillBalancingEnabled: false,
      skillCategories: defaultSkillCategories,
      teamCompositionRules: {},
      teamNamingCategoryId: null,
      maxTeams: 0, // 0 means no limit
      reservePlayersEnabled: false,
      manualTeamMode: false,
      activeView: 'teams',
      tournament: null,

      // Actions
      setEventInfo: (eventName: string, organizerName: string) =>
        set({ eventName, organizerName }),

      setMaxTeams: (count: number) => set({ maxTeams: count }),

      toggleReserveMode: () =>
        set((state) => ({
          reservePlayersEnabled: !state.reservePlayersEnabled,
        })),

      togglePlayerReserve: (playerId: number) =>
        set((state) =>
          syncPlayersAndTeams(
            state.players.map((p) =>
              p.id === playerId ? { ...p, isReserve: !p.isReserve } : p
            ),
            state.teams
          )
        ),

      addPlayer: (
        playerName: string,
        skillLevel?: string,
        isReserve: boolean = false
      ) =>
        set((state) => ({
          players: [
            ...state.players,
            {
              id: Date.now() + Math.random(),
              name: playerName,
              locked: false,
              teamId: null,
              skillLevel: skillLevel || undefined,
              isReserve,
            },
          ],
        })),

      updatePlayer: (
        playerId: number,
        updates: Partial<
          Pick<Player, 'name' | 'skillLevel' | 'isReserve'>
        >
      ) =>
        set((state) =>
          // Syncing refreshes the player's copy in their team and
          // removes them from it if they moved to reserves
          syncPlayersAndTeams(
            state.players.map((p) =>
              p.id === playerId ? { ...p, ...updates } : p
            ),
            state.teams
          )
        ),

      removePlayer: (playerId: number) =>
        set((state) =>
          syncPlayersAndTeams(
            state.players.filter((p) => p.id !== playerId),
            state.teams
          )
        ),

      clearTeams: () =>
        set((state) => syncPlayersAndTeams(state.players, [])),

      togglePlayerLock: (playerId: number) =>
        set((state) =>
          syncPlayersAndTeams(
            state.players.map((p) =>
              p.id === playerId ? { ...p, locked: !p.locked } : p
            ),
            state.teams
          )
        ),

      setManualMode: (enabled: boolean) =>
        set({ manualTeamMode: enabled }),

      setTeamSize: (size: number) => set({ teamSize: size }),

      toggleSkillBalancing: () =>
        set((state) => ({
          skillBalancingEnabled: !state.skillBalancingEnabled,
        })),

      createEmptyTeam: (teamName?: string) =>
        set((state) => ({
          teams: [
            ...state.teams,
            {
              id: Date.now() + Math.random(), // Ensure unique ID
              name: teamName || `Team ${state.teams.length + 1}`,
              players: [],
            },
          ],
        })),

      removeTeam: (teamId: number) =>
        set((state) => {
          if (!state.teams.some((t) => t.id === teamId)) return state;

          // Players on the removed team become unassigned, and players
          // on later teams get their shifted team index
          return syncPlayersAndTeams(
            state.players,
            state.teams.filter((t) => t.id !== teamId)
          );
        }),

      assignPlayerToTeam: (playerId: number, teamId: number) =>
        set((state) => {
          const player = state.players.find((p) => p.id === playerId);
          const targetTeam = state.teams.find((t) => t.id === teamId);

          if (!player || !targetTeam) return state;

          // Remove player from current team if assigned, then add to new team
          const updatedTeams = state.teams.map((t) => {
            const players = t.players.filter((p) => p.id !== playerId);
            return {
              ...t,
              players: t.id === teamId ? [...players, player] : players,
            };
          });

          return syncPlayersAndTeams(state.players, updatedTeams);
        }),

      removePlayerFromTeam: (playerId: number) =>
        set((state) =>
          syncPlayersAndTeams(
            state.players,
            state.teams.map((team) => ({
              ...team,
              players: team.players.filter((p) => p.id !== playerId),
            }))
          )
        ),

      addSkillCategory: (name: string, color: string) =>
        set((state) => ({
          skillCategories: [
            ...state.skillCategories,
            {
              id: `skill_${Date.now()}_${Math.random()
                .toString(36)
                .slice(2, 11)}`,
              name,
              color,
            },
          ],
        })),

      removeSkillCategory: (categoryId: string) =>
        set((state) => {
          // Don't remove if it's the last category
          if (state.skillCategories.length <= 1) return state;

          // Drop any composition rule that referenced this category
          const remainingRules = { ...state.teamCompositionRules };
          delete remainingRules[categoryId];

          return {
            skillCategories: state.skillCategories.filter(
              (cat) => cat.id !== categoryId
            ),
            teamCompositionRules: remainingRules,
            teamNamingCategoryId:
              state.teamNamingCategoryId === categoryId
                ? null
                : state.teamNamingCategoryId,
            // Remove skill level from players who had this category
            ...syncPlayersAndTeams(
              state.players.map((player) => ({
                ...player,
                skillLevel:
                  player.skillLevel === categoryId
                    ? undefined
                    : player.skillLevel,
              })),
              state.teams
            ),
          };
        }),

      updateSkillCategory: (categoryId: string, newName: string) =>
        set((state) => ({
          skillCategories: state.skillCategories.map((cat) =>
            cat.id === categoryId ? { ...cat, name: newName } : cat
          ),
        })),

      updateTeamNamingCategory: (categoryId: string | null) =>
        set({ teamNamingCategoryId: categoryId }),

      randomizeTeams: () => {
        const state = get();

        // Filter out reserve players from team assignment
        const activePlayers = state.players.filter(
          (p) => !p.isReserve
        );
        if (activePlayers.length === 0) return;

        let newTeams: Team[] = [];
        const numTeams = calculateOptimalTeamCount(
          activePlayers.length,
          state.teamSize,
          state.maxTeams
        );

        if (
          state.skillBalancingEnabled &&
          state.skillCategories.length > 0
        ) {
          newTeams = performSkillBalancedRandomization(
            activePlayers,
            numTeams,
            state
          );
        } else {
          // Use the existing standard randomization logic
          newTeams = performStandardRandomization(
            activePlayers,
            numTeams
          );
        }

        // Apply custom team naming
        newTeams = applyCustomTeamNaming(
          newTeams,
          state.teamNamingCategoryId,
          state.players
        );

        // Update player team assignments
        const synced = syncPlayersAndTeams(state.players, newTeams);

        // Create and save history entry
        const historyEntry = createHistoryEntry(
          synced.players,
          synced.teams,
          state
        );

        // Update state
        set({
          ...synced,
          history: [historyEntry, ...state.history].slice(0, 10),
        });
      },

      fillRemainingTeams: () => {
        const state = get();

        // Start from synced data so team indexes and rosters are current
        const current = syncPlayersAndTeams(state.players, state.teams);

        // Get only unassigned active players
        const unassignedPlayers = current.players.filter(
          (p) => !p.isReserve && p.teamId === null
        );

        if (unassignedPlayers.length === 0) return;

        // Get all active players (assigned + unassigned) to calculate total team needs
        const allActivePlayers = current.players.filter(
          (p) => !p.isReserve
        );

        // Calculate optimal number of teams based on ALL active players
        const optimalTeamCount = calculateOptimalTeamCount(
          allActivePlayers.length,
          state.teamSize,
          state.maxTeams
        );

        // Start with existing teams (deep copy)
        let updatedTeams = current.teams.map((team) => ({
          ...team,
          players: [...team.players],
        }));
        const existingTeamCount = updatedTeams.length;

        // Create additional teams if needed to reach optimal count
        while (updatedTeams.length < optimalTeamCount) {
          const newTeam: Team = {
            id: Date.now() + updatedTeams.length + Math.random(),
            name: `Team ${updatedTeams.length + 1}`,
            players: [],
          };
          updatedTeams.push(newTeam);
        }

        // Apply skill balancing or simple distribution to unassigned players only.
        // Teams fill up to the team size first; if every team is full, the
        // rest are spread evenly over the teams, as a full randomize does.
        if (
          state.skillBalancingEnabled &&
          state.skillCategories.length > 0
        ) {
          // Use skill-balanced approach
          const rules = state.teamCompositionRules;
          const hasRules = Object.keys(rules).length > 0;

          // Group unassigned players by skill
          const skillGroups = groupPlayersBySkill(
            unassignedPlayers,
            state.skillCategories
          );

          if (hasRules) {
            // Apply composition rules to fill team deficits
            distributePlayersByRulesWithDeficits(
              updatedTeams,
              rules,
              skillGroups,
              { ...current, teamSize: state.teamSize }
            );
          } else {
            // Even distribution by skill
            addPlayersToLeastFilledTeams(
              updatedTeams,
              Object.values(skillGroups).flat()
            );
          }

          // Handle locked unassigned players
          const lockedUnassigned = unassignedPlayers.filter(
            (p) => p.locked
          );
          addLockedPlayersToPartialTeams(
            updatedTeams,
            lockedUnassigned,
            state.teamSize
          );
        } else {
          // Simple random distribution
          addPlayersToLeastFilledTeams(
            updatedTeams,
            shuffle(unassignedPlayers)
          );
        }

        // Apply custom team naming to new teams and teams that still
        // have a default name, so names typed by the user are kept
        updatedTeams = applyCustomTeamNaming(
          updatedTeams,
          state.teamNamingCategoryId,
          current.players,
          (team, index) =>
            index >= existingTeamCount || /^Team \d+$/.test(team.name)
        );

        // Update player team assignments
        const synced = syncPlayersAndTeams(current.players, updatedTeams);

        // Create history entry
        const historyEntry = createHistoryEntry(
          synced.players,
          synced.teams,
          state
        );

        set({
          ...synced,
          history: [historyEntry, ...state.history].slice(0, 10),
        });
      },

      smartRandomizeTeams: () => {
        const state = get();

        if (state.manualTeamMode) {
          state.fillRemainingTeams();
        } else {
          state.randomizeTeams();
        }
      },

      updateTeamName: (teamId: number, newName: string) =>
        set((state) => ({
          teams: state.teams.map((t) =>
            t.id === teamId ? { ...t, name: newName } : t
          ),
        })),

      movePlayerToTeam: (playerId: number, newTeamIndex: number) =>
        set((state) => {
          const player = state.players.find((p) => p.id === playerId);
          if (
            !player ||
            player.locked ||
            newTeamIndex < 0 ||
            newTeamIndex >= state.teams.length
          ) {
            return state;
          }

          const updatedTeams = state.teams.map((team, index) => {
            const players = team.players.filter((p) => p.id !== playerId);
            return {
              ...team,
              players:
                index === newTeamIndex ? [...players, player] : players,
            };
          });

          return syncPlayersAndTeams(state.players, updatedTeams);
        }),

      loadHistoryEntry: (historyId: number) => {
        const state = get();
        const entry = state.history.find((h) => h.id === historyId);
        if (entry) {
          // Use the saved players array if available
          let playersToRestore: Player[];

          if (entry.players) {
            playersToRestore = entry.players;
          } else {
            const allPlayers = entry.teams.flatMap((t) => t.players);
            playersToRestore = allPlayers.filter(
              (player, idx, arr) =>
                arr.findIndex((p) => p.id === player.id) === idx
            );
          }

          set({
            ...syncPlayersAndTeams(
              playersToRestore,
              JSON.parse(JSON.stringify(entry.teams)) // Deep clone
            ),
            eventName: entry.eventName,
            organizerName: entry.organizerName,
            ...(entry.maxTeams !== undefined && {
              maxTeams: entry.maxTeams,
            }),
            ...(entry.teamSize !== undefined && {
              teamSize: entry.teamSize,
            }),
            ...(entry.reservePlayersEnabled !== undefined && {
              reservePlayersEnabled: entry.reservePlayersEnabled,
            }),
            ...(entry.skillBalancingEnabled !== undefined && {
              skillBalancingEnabled: entry.skillBalancingEnabled,
            }),
            ...(entry.skillCategories && {
              skillCategories: entry.skillCategories,
            }),
            ...(entry.teamCompositionRules && {
              teamCompositionRules: entry.teamCompositionRules,
            }),
            ...(entry.teamNamingCategoryId !== undefined && {
              teamNamingCategoryId: entry.teamNamingCategoryId,
            }),
          });
        }
      },

      clearAll: () =>
        set({
          eventName: '',
          organizerName: '',
          players: [],
          teams: [],
          teamSize: 1,
          tournament: null,
        }),

      clearHistory: () => set({ history: [] }),

      toggleDarkMode: () => {
        const newDarkMode = !get().darkMode;
        if (newDarkMode) {
          document.documentElement.classList.add('dark');
          document.body.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
          document.body.classList.remove('dark');
        }
        set({ darkMode: newDarkMode });
      },

      exportConfiguration: () => {
        const state = get();
        const exportData: ExportData = {
          version: '1.0',
          exportDate: new Date().toISOString(),
          eventName: state.eventName,
          organizerName: state.organizerName,
          players: state.players,
          teams: state.teams,
          teamSize: state.teamSize,
        };
        return JSON.stringify(exportData, null, 2);
      },

      importConfiguration: (jsonData: string) => {
        try {
          const data = JSON.parse(jsonData) as ExportData;

          // Validate the data structure
          if (
            !data.version ||
            !Array.isArray(data.players) ||
            !Array.isArray(data.teams) ||
            !data.players.every(
              (p) =>
                typeof p?.id === 'number' && typeof p?.name === 'string'
            ) ||
            !data.teams.every(
              (t) =>
                typeof t?.name === 'string' && Array.isArray(t?.players)
            )
          ) {
            return false;
          }

          const players: Player[] = data.players.map((p) => ({
            ...p,
            locked: Boolean(p.locked),
            teamId: null,
          }));

          set({
            eventName: data.eventName || '',
            organizerName: data.organizerName || '',
            ...syncPlayersAndTeams(players, data.teams),
            teamSize: data.teamSize || 1,
          });

          return true;
        } catch (error) {
          console.error('Failed to import configuration:', error);
          return false;
        }
      },
      setActiveView: (view) => set({ activeView: view }),

      startTournament: (settings, seeding, lowerTeamIds) =>
        set((state) => {
          // The tournament keeps its own copy of the teams, so later
          // edits on the Teams tab don't change a tournament in progress
          const teams = state.teams.map((team) => ({
            id: team.id,
            name: team.name,
            players: team.players.map((p) => p.name),
          }));
          return {
            tournament: createTournament(
              settings,
              teams,
              seeding,
              lowerTeamIds
            ),
          };
        }),

      recordMatchResult: (matchId, scoreA, scoreB) =>
        set((state) =>
          state.tournament
            ? {
                tournament: recordResult(
                  state.tournament,
                  matchId,
                  scoreA,
                  scoreB
                ),
              }
            : state
        ),

      clearMatchResult: (matchId) =>
        set((state) =>
          state.tournament
            ? { tournament: clearResult(state.tournament, matchId) }
            : state
        ),

      setGroupTieOrder: (groupId, teamIds) =>
        set((state) =>
          state.tournament
            ? {
                tournament: {
                  ...state.tournament,
                  tieOrder: {
                    ...state.tournament.tieOrder,
                    [groupId]: teamIds,
                  },
                },
              }
            : state
        ),

      advanceToBracket: () =>
        set((state) =>
          state.tournament && state.tournament.phase === 'groups'
            ? { tournament: startBracketStage(state.tournament) }
            : state
        ),

      endTournament: () => set({ tournament: null }),

      updateTeamCompositionRules: (rules: {
        [categoryId: string]: number;
      }) => set({ teamCompositionRules: rules }),
    }),
    {
      name: 'teamify-storage',
      // Repair rosters saved by older versions, where team copies of
      // players could be stale and teamIds could point at the wrong team
      merge: (persistedState, currentState) => {
        const merged = {
          ...currentState,
          ...(persistedState as Partial<AppStore>),
        };
        return {
          ...merged,
          ...syncPlayersAndTeams(merged.players, merged.teams),
        };
      },
      onRehydrateStorage: () => (state) => {
        if (state?.darkMode) {
          document.documentElement.classList.add('dark');
          document.body.classList.add('dark');
        }
      },
    }
  )
);

export default useStore;
