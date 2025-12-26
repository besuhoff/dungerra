# Dungerra

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

The game uses TypeScript and HTML5 Canvas for rendering. The main components are:

- `src/Game.ts`: Main game loop and initialization
- `src/entities/ScreenObject.ts`: Base class for all game objects
- `src/config.ts`: Game configuration

## Controls

- Arrow keys / A W S D: Aim
- Space: Shoot
- 1..8: Use inventory item
- Enter / Escape: Enter/exit shop
- F3: Toggle debug mode
