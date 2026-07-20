# Papercut

Papercut is a planned web-based 2.5D papercut animation editor. This repository is **phase 1 only**: a polished, interactive editor wireframe made from mock data, HTML, SVG-like CSS artwork, and UI state.

## Current phase

The app demonstrates the intended desktop workflow: layers, assets, creative tools, Compose/Stage views, an inspector, timeline, dialogs, selection, keyboard shortcuts, and paper-like scene depth. Editing, rendering, animation playback, importing, persistence, and export are deliberately mocked.

## Stack and setup

React, TypeScript, Vite, Tailwind CSS, Zustand, Lucide React, Vitest, ESLint, and Prettier power the prototype. Three.js and React Three Fiber are installed for a future phase but are not used.

```bash
npm install
npm run dev
```

Available scripts: `npm run dev`, `npm run build`, `npm run preview`, `npm run test`, `npm run lint`, `npm run format`, and `npm run typecheck`.

## Architecture

- `src/app`: shell and editor composition
- `src/components`: reusable editor controls
- `src/mock`: typed sample scene data
- `src/state`: lightweight UI state only
- `src/styles`: global wireframe styling
- `src/tests`: focused interaction tests

Read [architecture](docs/architecture.md), [UI concepts](docs/ui-concepts.md), and the [roadmap](docs/roadmap.md) for the planned production direction.

## Roadmap

1. Repository and UI wireframe
2. Basic scene and layer rendering
3. Selection and transforms
4. 2D layer editing
5. Shape cutting and extracted components
6. Timeline and keyframe evaluation
7. Motion paths and radial motion
8. Camera animation
9. Materials, cut edges, and torn edges
10. Lighting and shadows
11. Project save and load
12. Browser export
13. Tauri desktop packaging
14. Native video export
15. Separate folding-animation system
