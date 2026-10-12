# Prototype Test

A puzzle game built with Phaser 4

A Phaser 4 + TypeScript prototype. Play it at https://taigd98.github.io/test_project/demo/ · docs and Game Design Document at https://taigd98.github.io/test_project/docs/.

## Run

```bash
npm install
npm run dev      # http://localhost:8080
npm run build
```

## Releases

The live site is built locally and pushed to the `gh-pages` branch. There is no CI deploy.

```bash
npm run release:latest                  # after pushing main: update https://taigd98.github.io/test_project/
npm version minor && npm run release    # publish a frozen copy at /test_project/vX.Y.0/
```

The landing page lists every version. See `docs/guide/deployment.md` for details.
