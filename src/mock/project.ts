export type LayerTransform = {
  x: number
  y: number
  rotation: number
  width: number
  height: number
  opacity: number
}

export type SketchPoint = { x: number; y: number }
export type ShapeType = 'rect' | 'circle' | 'line' | 'spline' | 'pen'
export type CutShape = {
  id: string
  type: ShapeType
  points: SketchPoint[]
  closed: boolean
}
export type SketchObject = {
  id: string
  name: string
  shapes: CutShape[]
  closed: boolean
  visible: boolean
}
export type CutPiece = {
  id: string
  name: string
  sourceSketchId?: string
  shapes: CutShape[]
  x: number
  y: number
  rotation: number
  scaleX: number
  scaleY: number
  depthOffset: number
  visible: boolean
}
export type Layer = {
  id: string
  name: string
  depth: number
  color: string
  visible: boolean
  transform: LayerTransform
  sheetTransform: {
    x: number
    y: number
    rotation: number
    scaleX: number
    scaleY: number
    depthOffset: number
  }
  sketches: SketchObject[]
  cuts: CutShape[]
  pieces: CutPiece[]
}

const transform = (width: number, height: number): LayerTransform => ({
  x: 0,
  y: 0,
  rotation: 0,
  width,
  height,
  opacity: 100
})
const sheetTransform = () => ({
  x: 0,
  y: 0,
  rotation: 0,
  scaleX: 1,
  scaleY: 1,
  depthOffset: 0
})

export const layers: Layer[] = [
  {
    id: 'foreground',
    name: 'Foreground',
    depth: 900,
    color: '#6b8145',
    visible: true,
    transform: transform(25, 25),
    sheetTransform: sheetTransform(),
    sketches: [],
    cuts: [],
    pieces: []
  },
  {
    id: 'character',
    name: 'Character',
    depth: 420,
    color: '#db735a',
    visible: true,
    transform: transform(50, 50),
    sheetTransform: sheetTransform(),
    sketches: [],
    cuts: [],
    pieces: []
  },
  {
    id: 'background',
    name: 'Background',
    depth: 0,
    color: '#8bb7c6',
    visible: true,
    transform: transform(100, 100),
    sheetTransform: sheetTransform(),
    sketches: [],
    cuts: [],
    pieces: []
  }
]

export const assets = [
  { name: 'White paper', color: '#eee6d4' },
  { name: 'Kraft paper', color: '#bd925f' },
  { name: 'Watercolor', color: '#b8c3af' },
  { name: 'Cardboard', color: '#9b704b' },
  { name: 'Plywood', color: '#c59a68' },
  { name: 'Red construction', color: '#bd4e42' }
]
