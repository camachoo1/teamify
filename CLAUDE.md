# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install        # required first; node_modules is not committed
npm run dev        # Vite dev server with HMR
npm run build      # tsc -b (type check) then vite build
npm run lint       # eslint .
npm run preview    # serve the production build
```

There is no test suite. Use `npm run build` to type-check changes.

## What the app is

Teamify is a client-only React 19 + TypeScript + Vite app for organizing players into teams for an event (random or skill-balanced), with sharing and Challonge bracket embeds. There is no backend: all state lives in the browser.

## Architecture

### State: one persisted Zustand store
- `src/store/useStore.ts` is the single source of truth. It holds all state and actions, and is persisted to `localStorage` under `teamify-storage` via `zustand/middleware` `persist`.
- The `AppStore` interface in `src/types/index.ts` declares every state field and action. A new action needs to be added to both files.
- The heavy team-building logic lives in pure helpers in `src/utils/helper.ts`, which the store calls: randomization, skill grouping, composition-rule distribution, locked-player placement, team naming, history entries, and validation. These helpers mutate the `teams` array passed in.
- Components read the store with `useStore()` (no selectors) and destructure what they need.

### Data model quirks (read before changing team logic)
- **Each player is stored twice.** `state.players` is the master list, and each `team.players` holds *copies* of player objects. Any action that changes players or teams must return `syncPlayersAndTeams(players, teams)` (in `helper.ts`). It refreshes the copies, drops removed and reserve players from teams, and recomputes `teamId`. The persist `merge` option runs it on load to repair older saved data.
- **`player.teamId` is a position in the `teams` array, not a `Team.id`.** `Team.id` comes from `Date.now()` (+ `Math.random()`). This is why rosters must be re-synced after removing or reordering teams.
- `isReserve` players are excluded from team generation. `locked` players are meant to stay on their current team (by position) when teams are regenerated.
- `maxTeams === 0` means no limit.

### Two team modes
`manualTeamMode` (toggled in `TeamDisplay`) switches between:
- **Auto mode:** `randomizeTeams` rebuilds every team. Drag and drop uses `movePlayerToTeam(playerId, teamIndex)`.
- **Manual mode:** `createEmptyTeam`, `assignPlayerToTeam(playerId, team.id)` and `removePlayerFromTeam` by drag and drop, plus `fillRemainingTeams`, which places only unassigned players into existing teams and creates new ones if needed.

Both generation paths branch on `skillBalancingEnabled`, and then on whether `teamCompositionRules` (category id → required count per team) is non-empty. Every generation pushes a `HistoryEntry`; the store keeps the last 10.

### Tournaments
- The header switches between the Teams and Tournament tabs (`activeView` in the store). A tournament is stored as `state.tournament`, and it holds its own copy of the teams, so later edits on the Teams tab don't change it. Randomizing teams during a tournament asks to end it first.
- `src/tournament/engine.ts` holds the tournament logic as pure functions: single and double elimination (with optional bracket reset and split start), and groups then a bracket. Matches only store where each slot's team comes from (`Source`: a team, a bye, or the winner or loser of another match). `resolveMatches` works out teams, byes, winners and the champion from `results` each time. Results remember the two teams they were entered for, and are dropped automatically when an earlier result changes who plays.
- Group tables rank by series wins, then head-to-head among the tied teams, then map difference, then an order the organizer sets for ties that remain.
- Tournaments are not part of share links yet.

### Sharing (no server)
- `src/modals/ShareModal.tsx` serializes teams, reserves, skill categories and saved brackets into a compact JSON with short keys (`e`, `o`, `t`, `r`, `sc`, `b`, …). It base64url-encodes that into `#share=<data>` and then tries to shorten the URL with TinyURL. The encoding and decoding helpers are in `src/utils/share.ts`. They use UTF-8, and the decoder falls back to Latin-1 for old links. Brackets in a share link are only embedded if `isChallongeUrl` accepts them.
- There is no router: `react-router-dom` is a dependency, but nothing imports it. `App.tsx` watches the hash instead. When it starts with `#share=`, the app renders only `src/components/ShareView.tsx`, which decodes the data and shows a read-only view. ShareView also accepts the older `s` key for skill categories. If you change the format, keep both sides compatible with links already shared.

### Other persisted browser state
These live outside the Zustand store:
- `saved-brackets`: Challonge embeds, managed in `BracketIntegration.tsx` and read by `ShareModal`.
- `teamify-tour-completed`: whether the onboarding tour (`OnboardingOverlay`, `hooks/useOnboarding.ts`, `utils/onboarding.ts`) has been completed. Tour steps find their targets through `data-tour="..."` attributes on components.

### UI conventions
- Tailwind 3 with `darkMode: 'class'`. The `dark` class is toggled on `<html>`/`<body>` by `toggleDarkMode` and on store rehydration. Custom colors (`primary` ruby red, `surface-dark`, `card-dark`, …) and animations are in `tailwind.config.js`.
- Shared component classes (`.card`, `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.btn-danger`, `.input-field`) are defined in `src/index.css` under `@layer components`.
- `clsx` handles conditional classes, `lucide-react` provides icons, and `react-hook-form` drives the forms.
- Modals live in `src/modals/`. Each one takes `isOpen`/`onClose` props, returns `null` when closed, and handles Escape and backdrop clicks itself.
- Code style: single quotes (including in JSX attributes), 2-space indentation, wrapped at about 70 columns.
