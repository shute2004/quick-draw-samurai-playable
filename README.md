# QUICK-DRAW SAMURAI / 侍の早斬り

A lightweight samurai quick-draw reaction game built for YouTube Playables, with mobile and desktop support.

## Play

GitHub Pages URL after Pages is enabled:

https://shute2004.github.io/quick-draw-samurai-playable/

## Features

- One-button quick-draw reaction gameplay
- Mobile touch controls and desktop keyboard controls
- Progressive opponent difficulty
- Localized UI for English, Japanese, Spanish, Portuguese, French, German, Italian, Korean, Simplified Chinese, Traditional Chinese, Indonesian, and Russian
- YouTube Playables SDK integration
- Cloud save and score submission in the Playables environment
- Rewarded retry ads and interstitial ads every two completed runs in the Playables environment
- Responsive portrait, landscape, and desktop layouts

## Source and build

The canonical development source is maintained in `shute2004/minigame` under `youtube-playables/setsuna-no-migiri/`. This public repository contains a synchronized TypeScript source snapshot for hosting and evaluation.

GitHub Actions type-checks the TypeScript source, builds `dist/` only inside the workflow, packages `index.html`, `styles.css`, `.nojekyll`, and the generated JavaScript as a GitHub Pages artifact, and deploys that artifact directly to Pages. Generated `dist/` files are not committed to the repository.

## License

This repository is publicly visible for hosting and evaluation, but it is not open source. See `LICENSE` for details.
