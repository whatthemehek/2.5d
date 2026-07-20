# Architecture

## Current wireframe

The application composes a fixed editor shell from visual regions and uses Zustand for transient UI interactions. Mock project data is typed and deliberately separate from UI state. No project document is saved or mutated.

## Future systems

A future document model will own layers, components, assets, keyframes, and project settings. A separate renderer will use Three.js/R3F for physical layer depth, materials, lighting, and shadows. The animation engine, vector editor/cutting system, and export pipeline will remain independent modules that consume the document model; none are present today.
