# AGENTS.md

## Cursor Cloud specific instructions

### Overview

This is a **React Native (Expo SDK 51) mobile app** for extracting road network data from Overture Maps. It is a frontend-only repo — no local backend, database, or Docker. The backend lives in a separate repo (`webovertureextract`) and is accessed over WebSocket/REST.

### Running the dev server

```bash
npx expo start
```

The Metro bundler starts and serves JS bundles for iOS/Android platforms. See `README.md` for full details.

### Verifying bundle compilation

Since there is no iOS simulator or physical device in the Cloud VM, verify the Metro bundler works by requesting native bundles directly:

```bash
curl -s -o /dev/null -w "%{http_code}" "http://localhost:<PORT>/node_modules/expo/AppEntry.bundle?platform=ios&dev=true&hot=false&lazy=true"
```

Both iOS and Android bundles should return HTTP 200 with ~7MB payloads.

### Web mode caveat

`npx expo start --web` will serve HTML but the JS bundle fails to compile because `@maplibre/maplibre-react-native` is a native-only module with no web shim. This is expected — do not treat it as a bug.

### Lint

The `package.json` has `"lint": "eslint ."` but no ESLint config file (`.eslintrc.*` or `eslint.config.*`) exists in the repo. Running `npm run lint` will fail with a missing config error. This is a pre-existing issue.

### TypeScript

`npx tsc --noEmit` reports 3 pre-existing type errors related to MapLibre and Turf.js type incompatibilities. These do not block bundling or runtime.

### Missing assets

The repo's `app.json` references PNG assets (`icon.png`, `splash.png`, `adaptive-icon.png`, `favicon.png`) in `assets/`. These files were added as simple blue placeholder PNGs to allow Expo to build without errors. Only `icon.svg` existed originally.

### External backend dependency

The app connects to a remote FastAPI backend (URL in `src/constants/index.ts` as `DEFAULT_WS_URL`). The backend is not part of this repo and must be running separately for extraction features to work.
