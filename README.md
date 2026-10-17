# Buyer Globe

Interactive buyer and market explorer with global search, opportunity scores, and accelerated simulated aircraft and vessels.

## Run locally

Requires a Node.js version supported by the installed Vite release.

```sh
npm install
npm run dev
```

## Validate and build

```sh
npm run lint
npm run build
npm run preview
```

The `dist` folder is the static website output. No live-data backend or API key is required. Globe background textures load from an external image host.

## Project structure

- `src/App.jsx`: globe, selection, and layout
- `src/components`: sidebar, global search, KPI cards, and aircraft icons
- `src/data`: buyers, countries, opportunity scores, search index, and illustrative traffic routes
- `src/hooks/useSimulatedTraffic.js`: local traffic animation
- `src/responsive.css`: responsive layout and controls
- `archive/pre-cleanup`: inactive live feeds, old app backups, and starter assets retained for recovery; not part of the active app or lint checks

## Credentials

The app no longer reads the previous `.env` credentials. Keep credential files private and out of source control. You can revoke the unused AISStream key from your provider account.

## Traffic

Traffic is simulated, not live or suitable for navigation. Users can hide aircraft or vessels, pause movement, and choose an animation speed.
