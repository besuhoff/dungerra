# Dungerra

A multiplayer dungeon exploration game built with TypeScript, React, and HTML5 Canvas.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Start development server:

```bash
npm run dev
```

3. Build for production:

```bash
npm run build
```

## Development

The game uses TypeScript, React, and HTML5 Canvas for rendering. The main components are:

### Frontend Architecture

- **React Router**: Handles client-side routing between screens
- **Components**:
  - `LoginScreen`: Google authentication
  - `LeaderboardScreen`: Sessions list and leaderboard
  - `GameScreen`: Main game canvas wrapper
  - `LegendScreen`: Game instructions and tutorial
- **Game Engine**:
  - `src/utils/Game.ts`: Main game loop and initialization
  - `src/entities/`: Game entities (Player, Enemy, Bonus, etc.)
  - `src/config.ts`: Game configuration

### Routes

- `/`: Login screen
- `/leaderboard`: Main lobby with sessions and leaderboard
- `/legend`: Game instructions
- `/:sessionId`: Active game session

## Controls

- Arrow keys / A W S D: Aim
- Space: Shoot
- 1..8: Use inventory item
- ~ or E: Toggle inventory
- Enter / Escape: Enter/exit shop
- F3: Toggle debug mode
