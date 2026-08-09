import { create } from 'zustand'
import {
  layers,
  type CutPiece,
  type CutShape,
  type Layer,
  type LayerTransform,
  type SketchObject
} from '../mock/project'

export type Mode = 'compose' | 'sketch' | 'stage'
export type Tab = 'layers' | 'assets' | 'tools'
export type DialogName =
  'new' | 'import' | 'preview' | 'export' | 'shortcuts' | 'delete' | null
export type ReorderMode = 'cascade' | 'split'
export type EditorTool =
  | 'Select'
  | 'Move'
  | 'Rotate'
  | 'Scale'
  | 'Depth'
  | 'Rectangle'
  | 'Circle'
  | 'Line'
  | 'Pen'
  | 'Spline'

type SavedProject = {
  version: number
  sceneLayers: Layer[]
  reorderMode: ReorderMode
}
const storageKey = 'papercut.prototype.project.v1'
const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value))
const hydrateLayer = (
  layer: Partial<Layer> &
    Pick<Layer, 'id' | 'name' | 'depth' | 'color' | 'visible' | 'transform'>
): Layer =>
  ({
    ...layer,
    transform: { ...layer.transform },
    sheetTransform: layer.sheetTransform ?? { x: 0, y: 0, rotation: 0 },
    sketches: layer.sketches ?? [],
    cuts: layer.cuts ?? [],
    pieces: (layer.pieces ?? []).map((piece) => ({
      ...piece,
      rotation: piece.rotation ?? 0
    }))
  }) as Layer
const loadProject = (): SavedProject | null => {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(storageKey)
    return raw ? (JSON.parse(raw) as SavedProject) : null
  } catch {
    return null
  }
}
const saved = loadProject()
const initialLayers = () => (saved?.sceneLayers ?? layers).map(hydrateLayer)
const newId = (prefix: string) =>
  prefix + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7)

export type UIState = {
  mode: Mode
  tab: Tab
  tool: EditorTool
  selected: string
  activeSketchLayerId: string
  selectedRemainderLayerId: string | null
  selectedPieces: string[]
  selectedSketchIds: string[]
  dialog: DialogName
  time: number
  playing: boolean
  grid: boolean
  safeFrame: boolean
  material: string
  expanded: Record<string, boolean>
  keyframes: string[]
  sceneLayers: Layer[]
  orbit: { x: number; y: number }
  zoom: number
  reorderMode: ReorderMode
  saveStatus: 'saved' | 'unsaved'
  setMode: (mode: Mode) => void
  setTab: (tab: Tab) => void
  setTool: (tool: EditorTool) => void
  select: (id: string) => void
  selectLayer: (id: string) => void
  selectRemainder: (layerId: string) => void
  togglePieceSelection: (id: string, additive?: boolean) => void
  toggleSketchSelection: (id: string, additive?: boolean) => void
  setDialog: (dialog: DialogName) => void
  setTime: (time: number) => void
  togglePlaying: () => void
  toggleGrid: () => void
  toggleSafe: () => void
  setMaterial: (material: string) => void
  toggleExpanded: (id: string) => void
  toggleKey: (id: string) => void
  addLayer: () => void
  removeLayer: (id: string) => void
  setLayerDepth: (id: string, depth: number) => void
  moveRemainder: (layerId: string, dx: number, dy: number) => void
  rotateRemainder: (layerId: string, angle: number) => void
  setLayerTransform: (
    id: string,
    field: keyof LayerTransform,
    value: number
  ) => void
  toggleLayerVisibility: (id: string) => void
  renameLayer: (id: string, name: string) => void
  setLayerColor: (id: string, color: string) => void
  reorderLayer: (sourceId: string, targetId: string) => void
  setReorderMode: (mode: ReorderMode) => void
  setOrbit: (orbit: { x: number; y: number }) => void
  resetOrbit: () => void
  zoomIn: () => void
  zoomOut: () => void
  resetZoom: () => void
  setZoom: (zoom: number) => void
  addSketchObject: (layerId: string, object: SketchObject) => void
  updateSketchObjectShapes: (
    layerId: string,
    objectId: string,
    shapes: CutShape[]
  ) => void
  toggleSketchVisibility: (layerId: string, objectId: string) => void
  mergeSelectedSketches: () => void
  closeSelectedContours: () => void
  deleteSelectedSketches: () => void
  cutSelectedContours: () => void
  movePiece: (id: string, dx: number, dy: number) => void
  rotatePiece: (id: string, angle: number) => void
  togglePieceVisibility: (layerId: string, pieceId: string) => void
  deleteSelectedPieces: () => void
  joinSelectedPieces: () => void
  saveProject: () => void
}

export const useUIStore = create<UIState>((set, get) => ({
  mode: 'compose',
  tab: 'layers',
  tool: 'Select',
  selected: 'foreground',
  activeSketchLayerId: 'foreground',
  selectedRemainderLayerId: null,
  selectedPieces: [],
  selectedSketchIds: [],
  dialog: null,
  time: 4.2,
  playing: false,
  grid: true,
  safeFrame: true,
  material: 'White paper',
  expanded: {
    foreground: true,
    character: true,
    background: true,
    transform: true,
    layer: true
  },
  keyframes: [],
  sceneLayers: initialLayers(),
  orbit: { x: -18, y: 18 },
  zoom: 1,
  reorderMode: saved?.reorderMode ?? 'cascade',
  saveStatus: 'saved',
  setMode: (mode) =>
    set((state) => ({
      mode,
      tab: mode === 'sketch' ? 'layers' : state.tab,
      activeSketchLayerId:
        mode === 'sketch'
          ? state.sceneLayers.some((layer) => layer.id === state.selected)
            ? state.selected
            : state.activeSketchLayerId
          : state.activeSketchLayerId,
      selectedRemainderLayerId:
        mode === 'sketch' ? null : state.selectedRemainderLayerId,
      selectedPieces: mode === 'sketch' ? [] : state.selectedPieces,
      selectedSketchIds: mode === 'sketch' ? state.selectedSketchIds : [],
      tool: 'Select'
    })),
  setTab: (tab) => set({ tab }),
  setTool: (tool) => set({ tool }),
  select: (selected) => set({ selected }),
  selectLayer: (id) =>
    set((state) => ({
      selected: id,
      selectedRemainderLayerId: null,
      activeSketchLayerId:
        state.mode === 'sketch' ? id : state.activeSketchLayerId,
      selectedPieces: [],
      selectedSketchIds: []
    })),
  selectRemainder: (layerId) =>
    set({
      selected: layerId,
      selectedRemainderLayerId: layerId,
      selectedPieces: [],
      selectedSketchIds: []
    }),
  togglePieceSelection: (id, additive = false) =>
    set((state) => ({
      selectedPieces: additive
        ? state.selectedPieces.includes(id)
          ? state.selectedPieces.filter((item) => item !== id)
          : [...state.selectedPieces, id]
        : [id],
      selectedSketchIds: [],
      selectedRemainderLayerId: null
    })),
  toggleSketchSelection: (id, additive = false) =>
    set((state) => ({
      selectedSketchIds: additive
        ? state.selectedSketchIds.includes(id)
          ? state.selectedSketchIds.filter((item) => item !== id)
          : [...state.selectedSketchIds, id]
        : [id],
      selectedPieces: [],
      selectedRemainderLayerId: null
    })),
  setDialog: (dialog) => set({ dialog }),
  setTime: (time) => set({ time: clamp(time, 0, 12) }),
  togglePlaying: () => set((state) => ({ playing: !state.playing })),
  toggleGrid: () => set((state) => ({ grid: !state.grid })),
  toggleSafe: () => set((state) => ({ safeFrame: !state.safeFrame })),
  setMaterial: (material) => set({ material }),
  toggleExpanded: (id) =>
    set((state) => ({
      expanded: { ...state.expanded, [id]: !state.expanded[id] }
    })),
  toggleKey: (id) =>
    set((state) => ({
      keyframes: state.keyframes.includes(id)
        ? state.keyframes.filter((key) => key !== id)
        : [...state.keyframes, id]
    })),
  addLayer: () =>
    set((state) => {
      if (state.sceneLayers.length >= 3) return state
      const id = newId('layer')
      const layer: Layer = {
        id,
        name: 'Layer ' + (state.sceneLayers.length + 1),
        depth: 0,
        color: '#d6a36e',
        visible: true,
        transform: { x: 0, y: 0, rotation: 0, width: 50, height: 50, opacity: 100 },
        sheetTransform: { x: 0, y: 0, rotation: 0 },
        sketches: [],
        cuts: [],
        pieces: []
      }
      return {
        sceneLayers: [...state.sceneLayers, layer],
        selected: id,
        saveStatus: 'unsaved'
      }
    }),
  removeLayer: (id) =>
    set((state) => {
      const sceneLayers = state.sceneLayers.filter((layer) => layer.id !== id)
      return {
        sceneLayers,
        selected:
          state.selected === id ? (sceneLayers[0]?.id ?? '') : state.selected,
        activeSketchLayerId:
          state.activeSketchLayerId === id
            ? (sceneLayers[0]?.id ?? '')
            : state.activeSketchLayerId,
        saveStatus: 'unsaved'
      }
    }),
  setLayerDepth: (id, depth) =>
    set((state) => ({
      sceneLayers: state.sceneLayers.map((layer) =>
        layer.id === id ? { ...layer, depth: clamp(depth, -600, 1200) } : layer
      ),
      saveStatus: 'unsaved'
    })),
  moveRemainder: (layerId, dx, dy) =>
    set((state) => ({
      sceneLayers: state.sceneLayers.map((layer) =>
        layer.id === layerId
          ? {
              ...layer,
              sheetTransform: {
                ...layer.sheetTransform,
                x: layer.sheetTransform.x + dx,
                y: layer.sheetTransform.y + dy
              }
            }
          : layer
      ),
      saveStatus: 'unsaved'
    })),
  rotateRemainder: (layerId, angle) =>
    set((state) => ({
      sceneLayers: state.sceneLayers.map((layer) =>
        layer.id === layerId
          ? {
              ...layer,
              sheetTransform: {
                ...layer.sheetTransform,
                rotation: layer.sheetTransform.rotation + angle
              }
            }
          : layer
      ),
      saveStatus: 'unsaved'
    })),
  setLayerTransform: (id, field, value) =>
    set((state) => {
      const limits: Record<keyof LayerTransform, [number, number]> = {
        x: [-1000, 1000],
        y: [-1000, 1000],
        rotation: [-360, 360],
        width: [10, 150],
        height: [10, 150],
        opacity: [0, 100]
      }
      const [min, max] = limits[field]
      return {
        sceneLayers: state.sceneLayers.map((layer) =>
          layer.id === id
            ? {
                ...layer,
                transform: {
                  ...layer.transform,
                  [field]: clamp(value, min, max)
                }
              }
            : layer
        ),
        saveStatus: 'unsaved'
      }
    }),
  toggleLayerVisibility: (id) =>
    set((state) => ({
      sceneLayers: state.sceneLayers.map((layer) =>
        layer.id === id ? { ...layer, visible: !layer.visible } : layer
      ),
      saveStatus: 'unsaved'
    })),
  renameLayer: (id, name) =>
    set((state) => ({
      sceneLayers: state.sceneLayers.map((layer) =>
        layer.id === id
          ? { ...layer, name: name.slice(0, 32) || 'Untitled Layer' }
          : layer
      ),
      saveStatus: 'unsaved'
    })),
  setLayerColor: (id, color) =>
    set((state) => ({
      sceneLayers: state.sceneLayers.map((layer) =>
        layer.id === id ? { ...layer, color } : layer
      ),
      saveStatus: 'unsaved'
    })),
  reorderLayer: (sourceId, targetId) =>
    set((state) => {
      const source = state.sceneLayers.findIndex(
        (layer) => layer.id === sourceId
      )
      const target = state.sceneLayers.findIndex(
        (layer) => layer.id === targetId
      )
      if (source < 0 || target < 0 || source === target) return state
      const depthSlots = state.sceneLayers.map((layer) => layer.depth)
      let sceneLayers = [...state.sceneLayers]
      const [moved] = sceneLayers.splice(source, 1)
      sceneLayers.splice(target, 0, moved)
      if (state.reorderMode === 'cascade')
        sceneLayers = sceneLayers.map((layer, index) => ({
          ...layer,
          depth: depthSlots[index]
        }))
      else {
        const index = sceneLayers.findIndex((layer) => layer.id === sourceId)
        const before = sceneLayers[index - 1]
        const after = sceneLayers[index + 1]
        sceneLayers[index] = {
          ...sceneLayers[index],
          depth:
            before && after
              ? (before.depth + after.depth) / 2
              : before
                ? before.depth - 100
                : after
                  ? after.depth + 100
                  : 0
        }
      }
      const back = Math.min(...sceneLayers.map((layer) => layer.depth))
      return {
        sceneLayers: sceneLayers.map((layer) => ({
          ...layer,
          depth: Number((layer.depth - back).toFixed(2))
        })),
        saveStatus: 'unsaved'
      }
    }),
  setReorderMode: (reorderMode) => set({ reorderMode, saveStatus: 'unsaved' }),
  setOrbit: (orbit) => set({ orbit }),
  resetOrbit: () => set({ orbit: { x: -18, y: 18 } }),
  zoomIn: () =>
    set((state) => ({
      zoom: clamp(Number((state.zoom + 0.1).toFixed(2)), 0.5, 1.7)
    })),
  zoomOut: () =>
    set((state) => ({
      zoom: clamp(Number((state.zoom - 0.1).toFixed(2)), 0.5, 1.7)
    })),
  resetZoom: () => set({ zoom: 1 }),
  setZoom: (zoom) => set({ zoom: clamp(Number(zoom.toFixed(2)), 0.5, 1.7) }),
  addSketchObject: (layerId, object) =>
    set((state) => ({
      sceneLayers: state.sceneLayers.map((layer) =>
        layer.id === layerId
          ? { ...layer, sketches: [...layer.sketches, object] }
          : layer
      ),
      selectedSketchIds: [object.id],
      selectedPieces: [],
      saveStatus: 'unsaved'
    })),
  updateSketchObjectShapes: (layerId, objectId, shapes) =>
    set((state) => ({
      sceneLayers: state.sceneLayers.map((layer) =>
        layer.id === layerId
          ? {
              ...layer,
              sketches: layer.sketches.map((object) =>
                object.id === objectId ? { ...object, shapes } : object
              )
            }
          : layer
      ),
      saveStatus: 'unsaved'
    })),
  toggleSketchVisibility: (layerId, objectId) =>
    set((state) => ({
      sceneLayers: state.sceneLayers.map((layer) =>
        layer.id === layerId
          ? {
              ...layer,
              sketches: layer.sketches.map((object) =>
                object.id === objectId
                  ? { ...object, visible: !object.visible }
                  : object
              )
            }
          : layer
      ),
      saveStatus: 'unsaved'
    })),
  mergeSelectedSketches: () =>
    set((state) => {
      const layer = state.sceneLayers.find(
        (item) => item.id === state.activeSketchLayerId
      )
      const picked =
        layer?.sketches.filter((object) =>
          state.selectedSketchIds.includes(object.id)
        ) ?? []
      if (!layer || picked.length < 2) return state
      const id = newId('sketch')
      const allLines = picked.every((object) =>
        object.shapes.every(
          (shape) =>
            shape.type === 'line' ||
            shape.type === 'spline' ||
            shape.type === 'pen'
        )
      )
      const shapes: CutShape[] = allLines
        ? [
            {
              id: newId('shape'),
              type: 'pen',
              points: picked.flatMap((object, index) =>
                object.shapes.flatMap((shape) =>
                  index === 0 ? shape.points : shape.points.slice(1)
                )
              ),
              closed: true
            }
          ]
        : picked.flatMap((object) => object.shapes)
      const merged: SketchObject = {
        id,
        name: 'Merged contour',
        shapes,
        closed: allLines || picked.every((object) => object.closed),
        visible: true
      }
      return {
        sceneLayers: state.sceneLayers.map((item) =>
          item.id === layer.id
            ? {
                ...item,
                sketches: [
                  ...item.sketches.filter(
                    (object) => !state.selectedSketchIds.includes(object.id)
                  ),
                  merged
                ]
              }
            : item
        ),
        selectedSketchIds: [id],
        saveStatus: 'unsaved'
      }
    }),
  closeSelectedContours: () =>
    set((state) => ({
      sceneLayers: state.sceneLayers.map((layer) =>
        layer.id === state.activeSketchLayerId
          ? {
              ...layer,
              sketches: layer.sketches.map((object) =>
                state.selectedSketchIds.includes(object.id)
                  ? {
                      ...object,
                      closed: true,
                      shapes: object.shapes.map((shape) => ({
                        ...shape,
                        closed: true
                      }))
                    }
                  : object
              )
            }
          : layer
      ),
      saveStatus: 'unsaved'
    })),
  deleteSelectedSketches: () =>
    set((state) => ({
      sceneLayers: state.sceneLayers.map((layer) =>
        layer.id === state.activeSketchLayerId
          ? {
              ...layer,
              sketches: layer.sketches.filter(
                (object) => !state.selectedSketchIds.includes(object.id)
              )
            }
          : layer
      ),
      selectedSketchIds: [],
      saveStatus: 'unsaved'
    })),
  cutSelectedContours: () =>
    set((state) => {
      const layer = state.sceneLayers.find(
        (item) => item.id === state.activeSketchLayerId
      )
      if (!layer) return state
      const contours = layer.sketches.filter(
        (object) => state.selectedSketchIds.includes(object.id) && object.closed
      )
      if (!contours.length) return state
      const stamp = Date.now()
      const pieces: CutPiece[] = contours.map((object, index) => ({
        id: 'piece-' + stamp + '-' + index,
        name: object.name + ' cutout',
        sourceSketchId: object.id,
        shapes: object.shapes,
        x: 0,
        y: 0,
        rotation: 0,
        visible: true
      }))
      return {
        sceneLayers: state.sceneLayers.map((item) =>
          item.id === layer.id
            ? {
                ...item,
                cuts: [
                  ...item.cuts,
                  ...contours.flatMap((object) => object.shapes)
                ],
                pieces: [
                  ...item.pieces.filter(
                    (piece) =>
                      !contours.some(
                        (contour) => contour.id === piece.sourceSketchId
                      )
                  ),
                  ...pieces
                ],
                sketches: item.sketches.map((object) =>
                  contours.some((contour) => contour.id === object.id)
                    ? { ...object, visible: false }
                    : object
                )
              }
            : item
        ),
        selectedPieces: pieces.map((piece) => piece.id),
        selectedSketchIds: [],
        selected: layer.id,
        mode: 'compose',
        tool: 'Select',
        saveStatus: 'unsaved'
      }
    }),
  movePiece: (id, dx, dy) =>
    set((state) => ({
      sceneLayers: state.sceneLayers.map((layer) => ({
        ...layer,
        pieces: layer.pieces.map((piece) =>
          piece.id === id
            ? { ...piece, x: piece.x + dx, y: piece.y + dy }
            : piece
        )
      })),
      saveStatus: 'unsaved'
    })),
  rotatePiece: (id, angle) =>
    set((state) => ({
      sceneLayers: state.sceneLayers.map((layer) => ({
        ...layer,
        pieces: layer.pieces.map((piece) =>
          piece.id === id
            ? { ...piece, rotation: piece.rotation + angle }
            : piece
        )
      })),
      saveStatus: 'unsaved'
    })),
  togglePieceVisibility: (layerId, pieceId) =>
    set((state) => ({
      sceneLayers: state.sceneLayers.map((layer) =>
        layer.id === layerId
          ? {
              ...layer,
              pieces: layer.pieces.map((piece) =>
                piece.id === pieceId
                  ? { ...piece, visible: !piece.visible }
                  : piece
              )
            }
          : layer
      ),
      saveStatus: 'unsaved'
    })),
  deleteSelectedPieces: () =>
    set((state) => ({
      sceneLayers: state.sceneLayers.map((layer) => ({
        ...layer,
        pieces: layer.pieces.filter(
          (piece) => !state.selectedPieces.includes(piece.id)
        )
      })),
      selectedPieces: [],
      saveStatus: 'unsaved'
    })),
  joinSelectedPieces: () =>
    set((state) => {
      if (state.selectedPieces.length < 2) return state
      let joinedId = ''
      const sceneLayers = state.sceneLayers.map((layer) => {
        const picked = layer.pieces.filter((piece) =>
          state.selectedPieces.includes(piece.id)
        )
        if (picked.length < 2) return layer
        joinedId = newId('piece')
        const first = picked[0]
        return {
          ...layer,
          pieces: [
            ...layer.pieces.filter(
              (piece) => !state.selectedPieces.includes(piece.id)
            ),
            {
              id: joinedId,
              name: 'Joined pieces',
              shapes: picked.flatMap((piece) => piece.shapes),
              x: first.x,
              y: first.y,
              rotation: first.rotation,
              visible: true
            }
          ]
        }
      })
      return {
        sceneLayers,
        selectedPieces: joinedId ? [joinedId] : state.selectedPieces,
        saveStatus: 'unsaved'
      }
    }),
  saveProject: () => {
    const state = get()
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        version: 3,
        sceneLayers: state.sceneLayers,
        reorderMode: state.reorderMode
      })
    )
    set({ saveStatus: 'saved' })
  }
}))
