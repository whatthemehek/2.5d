# Architecture

## Current wireframe

The application composes a fixed editor shell from visual regions and uses Zustand for transient UI interactions. Mock project data is typed and deliberately separate from UI state. No project document is saved or mutated.

## Future systems

A future document model will own layers, components, assets, keyframes, and project settings. A separate renderer will use Three.js/R3F for physical layer depth, materials, lighting, and shadows. The current vector prototype stores layer-owned sketch objects and uses SVG masks to preserve a movable sheet remainder and extracted contour pieces. It is intentionally not the future production boolean-geometry engine. The renderer, animation engine, production vector system, and export pipeline will remain independent modules that consume a future document model.
