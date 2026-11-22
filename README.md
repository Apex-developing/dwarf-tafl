# Dwarf Tafl

An asymmetric tactical board game on a hex board, playable in the browser and installable as a PWA.
The **King's Clan** (1 king + 5 guards) tries to lead the King out through one of three exits;
the **Rebels** (9 warriors) try to surround him. Moves are driven by 2d6 dice, rolled in the app
or with real dice.

- Two players on one device (face-to-face layout) or against the computer (easy / medium / hard)
- English, German and Ukrainian
- Rules with position diagrams are built into the game

## Development

```bash
npm install
npm run dev       # http://localhost:3000
npm test          # engine tests
npm run build     # type-check + production bundle in dist/
```

Built with Vite, React, TypeScript, PixiJS and Tailwind. The game engine (`src/engine`) is pure
and framework-free; the AI lives next to it.

## Deployment

Every push to `main` is built and published to GitHub Pages by
`.github/workflows/deploy.yml`. Asset URLs are relative, so the same build works from any path.
