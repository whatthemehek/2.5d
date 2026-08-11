import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode
} from 'react'
import * as I from 'lucide-react'
import {
  assets,
  type CutShape,
  type Layer,
  type SketchObject,
  type SketchPoint
} from '../mock/project'
import paperTexture from '../assets/paper001/Paper001_2K-JPG_Color.jpg'
import { EmptyState, IconButton, Property, Section } from '../components/ui'
import { useUIStore, type EditorTool } from '../state/uiStore'

const drawTools: { name: EditorTool; icon: typeof I.Square; hint: string }[] = [
  {
    name: 'Rectangle',
    icon: I.Square,
    hint: 'Drag a rectangular closed contour'
  },
  { name: 'Circle', icon: I.Circle, hint: 'Drag an elliptical closed contour' },
  { name: 'Line', icon: I.Minus, hint: 'Drag a straight open segment' },
  { name: 'Pen', icon: I.PenTool, hint: 'Drag a freehand contour' },
  { name: 'Spline', icon: I.Spline, hint: 'Drag a smooth editable curve' }
]
const editTools: {
  name: EditorTool
  icon: typeof I.MousePointer2
  hint: string
}[] = [
  { name: 'Select', icon: I.MousePointer2, hint: 'Select and drag an object' },
  { name: 'Move', icon: I.Move, hint: 'Move the selected object' },
  { name: 'Rotate', icon: I.RotateCw, hint: 'Drag horizontally to rotate' },
  { name: 'Scale', icon: I.Maximize, hint: 'Drag to resize' }
]
const menus = {
  File: ['New Project', 'Open Project', 'Save', 'Import Artwork', 'Export'],
  Edit: ['Undo', 'Redo', 'Cut', 'Copy', 'Paste'],
  View: ['Grid', 'Safe Frame', 'Fit to View'],
  Project: ['Project Settings', 'Scene Lighting'],
  Help: ['Keyboard Shortcuts', 'About Papercut']
}

function TopToolbar() {
  const { mode, setMode, setDialog, saveProject, saveStatus } = useUIStore()
  const [open, setOpen] = useState<string | null>(null)
  return (
    <header className="toolbar">
      <div className="wordmark">
        <span>✦</span> Papercut
      </div>
      {Object.keys(menus).map((menu) => (
        <div className="menu" key={menu}>
          <button onClick={() => setOpen(open === menu ? null : menu)}>
            {menu}
          </button>
          {open === menu && (
            <div className="dropdown">
              {menus[menu as keyof typeof menus].map((item) => (
                <button
                  key={item}
                  onClick={() => {
                    setOpen(null)
                    if (item === 'Save') saveProject()
                    if (item === 'New Project') setDialog('new')
                    if (item === 'Import Artwork') setDialog('import')
                    if (item === 'Export') setDialog('export')
                    if (item === 'Keyboard Shortcuts') setDialog('shortcuts')
                  }}
                >
                  {item}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
      <span className="toolbar-divider" />
      <IconButton label="Undo">
        <I.Undo2 size={15} />
      </IconButton>
      <IconButton label="Redo">
        <I.Redo2 size={15} />
      </IconButton>
      <div className="project-name">
        Untitled Paper Scene{' '}
        <small className={saveStatus}>
          ● {saveStatus === 'saved' ? 'Saved' : 'Unsaved'}
        </small>
      </div>
      <div className="mode-switch" aria-label="Workspace mode">
        {(['compose', 'sketch', 'stage'] as const).map((item) => (
          <button
            key={item}
            className={mode === item ? 'active' : ''}
            onClick={() => setMode(item)}
          >
            {item[0].toUpperCase() + item.slice(1)}
          </button>
        ))}
      </div>
      <button className="button" onClick={() => setDialog('preview')}>
        <I.Play size={14} /> Preview
      </button>
      <button className="button accent" onClick={() => setDialog('export')}>
        <I.Share2 size={14} /> Export
      </button>
    </header>
  )
}

function LayerHierarchy() {
  const {
    mode,
    tab,
    setTab,
    sceneLayers,
    selected,
    selectedRemainderLayerId,
    selectedPieces,
    selectedSketchIds,
    expanded,
    toggleExpanded,
    selectLayer,
    selectRemainder,
    togglePieceSelection,
    toggleSketchSelection,
    toggleLayerVisibility,
    togglePieceVisibility,
    deletePiece,
    toggleSketchVisibility,
    renameLayer,
    setLayerColor,
    setLayerDepth,
    removeLayer,
    addLayer,
    reorderLayer,
    reorderMode,
    setReorderMode,
    setMode,
    material,
    setMaterial
  } = useUIStore()
  const [dragging, setDragging] = useState<string | null>(null)
  const atLimit = sceneLayers.length >= 3
  return (
    <aside className="sidebar hierarchy-panel">
      <div className="tabs">
        {(['layers', 'assets', 'tools'] as const).map((name) => (
          <button
            key={name}
            className={tab === name ? 'active' : ''}
            onClick={() => setTab(name)}
          >
            {name}
          </button>
        ))}
      </div>
      <div className="sidebar-content">
        <div className="sidebar-label">
          LAYERS & OBJECTS <small>{sceneLayers.length} / 3</small>
        </div>
        <label className="reorder-mode">
          Reorder depth
          <select
            aria-label="Reorder depth mode"
            value={reorderMode}
            onChange={(event) =>
              setReorderMode(event.target.value as 'cascade' | 'split')
            }
          >
            <option value="cascade">Cascade</option>
            <option value="split">Split</option>
          </select>
        </label>
        {sceneLayers.map((layer) => {
          const open = expanded[layer.id] !== false
          const active =
            selected === layer.id ||
            (mode === 'sketch' &&
              useUIStore.getState().activeSketchLayerId === layer.id)
          return (
            <div
              className={
                'layer-entry hierarchy-layer ' + (active ? 'active-layer' : '')
              }
              data-layer-id={layer.id}
              key={layer.id}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => {
                if (dragging) reorderLayer(dragging, layer.id)
                setDragging(null)
              }}
            >
              <div className={'layer-row ' + (active ? 'selected' : '')}>
                <button
                  className="hierarchy-chevron"
                  aria-label={(open ? 'Collapse ' : 'Expand ') + layer.name}
                  onClick={() => toggleExpanded(layer.id)}
                >
                  {open ? (
                    <I.ChevronDown size={14} />
                  ) : (
                    <I.ChevronRight size={14} />
                  )}
                </button>
                <span
                  className="drag-handle"
                  draggable
                  aria-label={'Drag ' + layer.name}
                  onDragStart={() => setDragging(layer.id)}
                  onDragEnd={() => setDragging(null)}
                >
                  <I.GripVertical size={13} />
                </span>
                <span className="thumb" style={{ background: layer.color }} />
                <input
                  aria-label={'Rename ' + layer.name}
                  value={layer.name}
                  onChange={(event) =>
                    renameLayer(layer.id, event.target.value)
                  }
                  onFocus={() => selectLayer(layer.id)}
                />
                <button
                  className="visibility-layer"
                  aria-label={(layer.visible ? 'Hide ' : 'Show ') + layer.name}
                  onClick={() => toggleLayerVisibility(layer.id)}
                >
                  {layer.visible ? <I.Eye size={14} /> : <I.EyeOff size={14} />}
                </button>
                <input
                  className="layer-color"
                  aria-label={'Color for ' + layer.name}
                  type="color"
                  value={layer.color}
                  onChange={(event) =>
                    setLayerColor(layer.id, event.target.value)
                  }
                />
                <button
                  className="remove-layer"
                  aria-label={'Remove ' + layer.name}
                  onClick={() => removeLayer(layer.id)}
                >
                  <I.Trash2 size={13} />
                </button>
              </div>
              {open && (
                <div className="hierarchy-children">
                  <button
                    className={
                      selectedRemainderLayerId === layer.id
                        ? 'hierarchy-item selected'
                        : 'hierarchy-item'
                    }
                    onClick={() => selectRemainder(layer.id)}
                  >
                    <I.Square size={13} />
                    <span>Sheet remainder</span>
                    <small>object</small>
                  </button>
                  {layer.pieces.map((piece) => (
                    <div className="hierarchy-line" key={piece.id}>
                      <button
                        className={
                          selectedPieces.includes(piece.id)
                            ? 'hierarchy-item selected'
                            : 'hierarchy-item'
                        }
                        onClick={(event) => {
                          selectLayer(layer.id)
                          togglePieceSelection(piece.id, event.shiftKey)
                        }}
                      >
                        <I.Scissors size={13} />
                        <span>{piece.name}</span>
                        <small>cutout / z {piece.depthOffset}</small>
                      </button>
                      <button
                        aria-label={
                          (piece.visible ? 'Hide ' : 'Show ') + piece.name
                        }
                        onClick={() =>
                          togglePieceVisibility(layer.id, piece.id)
                        }
                      >
                        {piece.visible ? (
                          <I.Eye size={12} />
                        ) : (
                          <I.EyeOff size={12} />
                        )}
                      </button>
                      <button
                        className="hierarchy-delete"
                        aria-label={'Delete ' + piece.name}
                        onClick={() => deletePiece(piece.id)}
                      >
                        <I.Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                  {layer.sketches.map((sketch) => (
                    <div className="hierarchy-line sketch-line" key={sketch.id}>
                      <button
                        className={
                          selectedSketchIds.includes(sketch.id)
                            ? 'hierarchy-item selected'
                            : 'hierarchy-item'
                        }
                        onClick={(event) => {
                          selectLayer(layer.id)
                          if (mode !== 'sketch') setMode('sketch')
                          toggleSketchSelection(sketch.id, event.shiftKey)
                        }}
                      >
                        <I.PenTool size={13} />
                        <span>{sketch.name}</span>
                        <small className={sketch.closed ? 'closed' : 'open'}>
                          {sketch.closed ? 'closed' : 'open'}
                        </small>
                      </button>
                      <button
                        aria-label={
                          (sketch.visible ? 'Hide ' : 'Show ') + sketch.name
                        }
                        onClick={() =>
                          toggleSketchVisibility(layer.id, sketch.id)
                        }
                      >
                        {sketch.visible ? (
                          <I.Eye size={12} />
                        ) : (
                          <I.EyeOff size={12} />
                        )}
                      </button>
                    </div>
                  ))}
                  <button
                    className="edit-sketch"
                    onClick={() => {
                      selectLayer(layer.id)
                      setMode('sketch')
                    }}
                  >
                    <I.PencilRuler size={13} /> Edit sketch
                  </button>
                </div>
              )}
              <label className="depth-editor">
                <span>Depth</span>
                <input
                  aria-label={'Depth for ' + layer.name}
                  type="number"
                  value={layer.depth}
                  onChange={(event) =>
                    setLayerDepth(layer.id, Number(event.target.value))
                  }
                />
                <small>px</small>
              </label>
            </div>
          )
        })}
        <button
          className="add-layer"
          disabled={atLimit}
          onClick={addLayer}
          title={
            atLimit
              ? 'This prototype supports up to three layers.'
              : 'Add a layer'
          }
        >
          <I.Plus size={15} /> Add Layer <small>{sceneLayers.length} / 3</small>
        </button>
        {tab === 'assets' && (
          <>
            <div className="sidebar-label auxiliary">PAPER TEXTURES</div>
            <div className="assets">
              {assets.map((asset) => (
                <button
                  key={asset.name}
                  className={material === asset.name ? 'selected' : ''}
                  onClick={() => setMaterial(asset.name)}
                >
                  <span style={{ background: asset.color }} />
                  {asset.name}
                </button>
              ))}
            </div>
          </>
        )}
        {tab === 'tools' && (
          <div className="sidebar-note">
            <I.ArrowUp size={15} />
            <span>Tools stay in the bar above the canvas.</span>
          </div>
        )}
      </div>
    </aside>
  )
}

function ToolButton({
  name,
  icon: Icon,
  hint
}: {
  name: EditorTool
  icon: typeof I.MousePointer2
  hint: string
}) {
  const { tool, setTool } = useUIStore()
  return (
    <button
      title={hint}
      aria-label={name + ' tool'}
      className={tool === name ? 'active' : ''}
      onClick={() => setTool(name)}
    >
      <Icon size={16} />
      <span>{name}</span>
    </button>
  )
}

function WorkspaceToolStrip() {
  const {
    mode,
    selectedSketchIds,
    sceneLayers,
    activeSketchLayerId,
    mergeSelectedSketches,
    closeSelectedContours,
    cutSelectedContours,
    deleteSelectedSketches
  } = useUIStore()
  const selectedSketches =
    sceneLayers
      .find((layer) => layer.id === activeSketchLayerId)
      ?.sketches.filter((object) => selectedSketchIds.includes(object.id)) ?? []
  const canCut = selectedSketches.some((object) => object.closed)
  if (mode === 'stage')
    return (
      <div className="workspace-tools stage-tools">
        <span>
          <I.Orbit size={15} /> Drag the canvas to orbit
        </span>
      </div>
    )
  return (
    <div className={'workspace-tools ' + mode}>
      <div className="tool-group">
        {editTools.map((item) => (
          <ToolButton key={item.name} {...item} />
        ))}
      </div>
      {mode === 'sketch' && (
        <>
          <div className="tool-group draw-group">
            {drawTools.map((item) => (
              <ToolButton key={item.name} {...item} />
            ))}
          </div>
          <div className="tool-group action-group">
            <button
              disabled={selectedSketchIds.length < 2}
              onClick={mergeSelectedSketches}
            >
              <I.Combine size={15} /> Merge
            </button>
            <button
              disabled={!selectedSketchIds.length}
              onClick={closeSelectedContours}
            >
              <I.LassoSelect size={15} /> Close contour
            </button>
            <button
              className="cut-command"
              disabled={!canCut}
              onClick={cutSelectedContours}
            >
              <I.Scissors size={15} /> Cut selected
            </button>
            <button
              disabled={!selectedSketchIds.length}
              onClick={deleteSelectedSketches}
              aria-label="Delete selected sketches"
            >
              <I.Trash2 size={15} />
            </button>
          </div>
        </>
      )}
      <span className="workspace-context">
        {mode === 'sketch'
          ? selectedSketchIds.length
            ? selectedSketchIds.length + ' sketch object selected'
            : 'Draw on the isolated layer'
          : 'Select, move, rotate, or scale the active object'}
      </span>
    </div>
  )
}

function shapeBounds(shapes: CutShape[]) {
  const points = shapes.flatMap((shape) => shape.points)
  if (!points.length) return { x: 0, y: 0, width: 0, height: 0, cx: 0, cy: 0 }
  const xs = points.map((point) => point.x),
    ys = points.map((point) => point.y)
  const x = Math.min(...xs),
    y = Math.min(...ys),
    width = Math.max(...xs) - x,
    height = Math.max(...ys) - y
  return {
    x,
    y,
    width: Math.max(width, 1),
    height: Math.max(height, 1),
    cx: x + width / 2,
    cy: y + height / 2
  }
}

function ShapeGeometry({
  shape,
  fill = 'none',
  stroke = 'currentColor',
  strokeWidth = 1
}: {
  shape: CutShape
  fill?: string
  stroke?: string
  strokeWidth?: number
}) {
  const points = shape.points
  if (!points.length) return null
  const a = points[0],
    b = points[points.length - 1] ?? a
  if (shape.type === 'rect')
    return (
      <rect
        x={Math.min(a.x, b.x)}
        y={Math.min(a.y, b.y)}
        width={Math.abs(b.x - a.x)}
        height={Math.abs(b.y - a.y)}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
    )
  if (shape.type === 'circle')
    return (
      <ellipse
        cx={(a.x + b.x) / 2}
        cy={(a.y + b.y) / 2}
        rx={Math.abs(b.x - a.x) / 2}
        ry={Math.abs(b.y - a.y) / 2}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
    )
  const value = points.map((point) => point.x + ',' + point.y).join(' ')
  if (shape.closed)
    return (
      <polygon
        points={value}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
    )
  return (
    <polyline
      points={value}
      fill="none"
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  )
}

function PaperSurface({ layer }: { layer: Layer }) {
  const sheet = layer.sheetTransform
  const apparentDepth = Math.max(0, layer.depth + sheet.depthOffset)
  const shadowOffset = Math.max(1, Math.min(8, apparentDepth / 120))
  const shadowBlur = Math.max(1.5, Math.min(9, apparentDepth / 100))
  return (
    <svg
      className="paper-sheet"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <pattern
          id={'paper-' + layer.id}
          width="100"
          height="100"
          patternUnits="userSpaceOnUse"
        >
          <image
            href={paperTexture}
            width="100"
            height="100"
            preserveAspectRatio="xMidYMid slice"
          />
        </pattern>
        <mask id={'mask-' + layer.id}>
          <rect width="100" height="100" fill="white" />
          {layer.cuts.map((shape) => (
            <ShapeGeometry
              key={shape.id}
              shape={shape}
              fill="black"
              stroke="black"
              strokeWidth={1.5}
            />
          ))}
        </mask>
      </defs>
      <g
        data-paper-surface={layer.id}
        transform={
          'translate(' +
          sheet.x +
          ' ' +
          sheet.y +
          ') rotate(' +
          sheet.rotation +
          ' 50 50) translate(50 50) scale(' +
          sheet.scaleX +
          ' ' +
          sheet.scaleY +
          ') translate(-50 -50)'
        }
        mask={'url(#mask-' + layer.id + ')'}
        style={{
          filter:
            'drop-shadow(0 ' +
            shadowOffset +
            'px ' +
            shadowBlur +
            'px rgba(0,0,0,.42))'
        }}
      >
        <rect width="100" height="100" fill={'url(#paper-' + layer.id + ')'} />
        <rect
          width="100"
          height="100"
          fill={layer.color}
          opacity=".72"
          style={{ mixBlendMode: 'multiply' }}
        />
      </g>
    </svg>
  )
}

function SelectionBounds({ shapes }: { shapes: CutShape[] }) {
  const bounds = shapeBounds(shapes)
  const left = bounds.x <= 0 ? 1 : bounds.x - 1
  const top = bounds.y <= 0 ? 1 : bounds.y - 1
  const right =
    bounds.x + bounds.width >= 100 ? 99 : bounds.x + bounds.width + 1
  const bottom =
    bounds.y + bounds.height >= 100 ? 99 : bounds.y + bounds.height + 1
  const rotateBelow = top < 8
  const rotateLineY = rotateBelow ? top + 6 : top - 6
  const rotateY = rotateBelow ? top + 7 : top - 7
  return (
    <g className="vector-selection">
      <rect x={left} y={top} width={right - left} height={bottom - top} />
      {[
        [left, top],
        [right, top],
        [left, bottom],
        [right, bottom]
      ].map(([x, y], index) => (
        <rect
          data-handle="scale"
          className="vector-handle"
          key={index}
          x={x - 0.8}
          y={y - 0.8}
          width="1.6"
          height="1.6"
        />
      ))}
      <line x1={bounds.cx} y1={top} x2={bounds.cx} y2={rotateLineY} />
      <circle
        data-handle="rotate"
        className="rotate-handle"
        cx={bounds.cx}
        cy={rotateY}
        r="1.2"
      />
      <circle
        data-handle="move"
        className="move-handle"
        cx={bounds.cx}
        cy={bounds.cy}
        r="2.5"
      />
      <path
        className="move-handle-icon"
        d={
          'M ' +
          (bounds.cx - 1.4) +
          ' ' +
          bounds.cy +
          ' H ' +
          (bounds.cx + 1.4) +
          ' M ' +
          bounds.cx +
          ' ' +
          (bounds.cy - 1.4) +
          ' V ' +
          (bounds.cy + 1.4)
        }
      />
    </g>
  )
}

type Gesture = {
  kind: string
  id?: string
  layerId?: string
  startClient: { x: number; y: number }
  startPoint?: SketchPoint
  startShapes?: CutShape[]
  transform?: Layer['transform']
  depth?: number
}

function Scene() {
  const {
    mode,
    tool,
    sceneLayers,
    selected,
    activeSketchLayerId,
    selectedSketchIds,
    selectedPieces,
    grid,
    safeFrame,
    zoom,
    orbit,
    zoomIn,
    zoomOut,
    resetZoom,
    toggleGrid,
    toggleSafe,
    setOrbit,
    resetOrbit,
    selectRemainder,
    moveRemainder,
    rotateRemainder,
    scaleRemainder,
    changeRemainderDepth,
    selectedRemainderLayerId,
    toggleSketchSelection,
    togglePieceSelection,
    addSketchObject,
    updateSketchObjectShapes,
    setLayerTransform,
    setLayerDepth,
    movePiece,
    rotatePiece,
    scalePiece,
    changePieceDepth
  } = useUIStore()
  const viewportRef = useRef<HTMLElement | null>(null)
  const stageRef = useRef<HTMLDivElement | null>(null)
  const gesture = useRef<Gesture | null>(null)
  const [liveShape, setLiveShape] = useState<CutShape | null>(null)
  const resolveInteractionLayerId = (
    state: ReturnType<typeof useUIStore.getState>
  ) => {
    const pieceLayer = state.sceneLayers.find((layer) =>
      layer.pieces.some((piece) => state.selectedPieces.includes(piece.id))
    )
    const sketchLayer = state.sceneLayers.find((layer) =>
      layer.sketches.some((sketch) =>
        state.selectedSketchIds.includes(sketch.id)
      )
    )
    return (
      state.selectedRemainderLayerId ??
      pieceLayer?.id ??
      sketchLayer?.id ??
      state.sceneLayers.find((layer) => layer.id === state.selected)?.id ??
      state.activeSketchLayerId
    )
  }
  const interactionLayerId = resolveInteractionLayerId(useUIStore.getState())
  useEffect(() => {
    const viewer = viewportRef.current
    if (!viewer) return
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault()
      event.stopPropagation()
      if (event.deltaY === 0) return
      const state = useUIStore.getState()
      state.setZoom(state.zoom + (event.deltaY < 0 ? 0.08 : -0.08))
    }
    viewer.addEventListener('wheel', handleWheel, { passive: false })
    return () => viewer.removeEventListener('wheel', handleWheel)
  }, [])
  const depths = sceneLayers.map((layer) => layer.depth)
  const depthSpan = depths.length
    ? Math.max(...depths) - Math.min(...depths)
    : 0
  const autoFit =
    mode === 'stage'
      ? Math.max(0.46, Math.min(0.86, 900 / (900 + depthSpan * 0.58)))
      : 1
  const visibleZoom = zoom * autoFit
  const layerPoint = (event: ReactPointerEvent, layerId: string) => {
    const element = stageRef.current?.querySelector<HTMLElement>(
      '[data-canvas-layer="' + layerId + '"]'
    )
    const rect = element?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    return {
      x: Math.max(
        0,
        Math.min(100, ((event.clientX - rect.left) / rect.width) * 100)
      ),
      y: Math.max(
        0,
        Math.min(100, ((event.clientY - rect.top) / rect.height) * 100)
      )
    }
  }
  const cloneShapes = (shapes: CutShape[]) =>
    shapes.map((shape) => ({
      ...shape,
      points: shape.points.map((point) => ({ ...point }))
    }))
  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    const target = event.target as HTMLElement
    const currentState = useUIStore.getState()
    const activeTool = currentState.tool
    if (mode === 'stage') {
      gesture.current = {
        kind: 'orbit',
        startClient: { x: event.clientX, y: event.clientY },
        depth: orbit.x,
        transform: {
          x: orbit.y,
          y: 0,
          rotation: 0,
          width: 0,
          height: 0,
          opacity: 0
        }
      }
      event.currentTarget.setPointerCapture?.(event.pointerId)
      return
    }

    const remainderEl = target.closest<SVGElement>('[data-remainder-id]')
    const pieceEl = target.closest<SVGElement>('[data-piece-id]')
    const sketchEl = target.closest<SVGElement>('[data-sketch-id]')
    const layerControlEl = target.closest<SVGElement>('[data-layer-control-id]')
    const layerEl = target.closest<HTMLElement>('[data-canvas-layer]')
    const clickedLayerId =
      pieceEl?.dataset.layerId ?? layerEl?.dataset.canvasLayer
    const lockedLayerId = resolveInteractionLayerId(currentState)
    const explicitTransform =
      activeTool === 'Move' ||
      activeTool === 'Rotate' ||
      activeTool === 'Scale' ||
      activeTool === 'Depth'
    if (explicitTransform) {
      const selectedSketchId =
        currentState.selectedSketchIds.length === 1
          ? currentState.selectedSketchIds[0]
          : null
      const selectedPieceId =
        currentState.selectedPieces.length === 1
          ? currentState.selectedPieces[0]
          : null
      const selectedSketchLayer = selectedSketchId
        ? currentState.sceneLayers.find((layer) =>
            layer.sketches.some((sketch) => sketch.id === selectedSketchId)
          )
        : undefined
      const selectedPieceLayer = selectedPieceId
        ? currentState.sceneLayers.find((layer) =>
            layer.pieces.some((piece) => piece.id === selectedPieceId)
          )
        : undefined
      const selectedLayer = currentState.sceneLayers.find(
        (layer) => layer.id === lockedLayerId
      )

      if (selectedSketchId && selectedSketchLayer && activeTool !== 'Depth') {
        const object = selectedSketchLayer.sketches.find(
          (sketch) => sketch.id === selectedSketchId
        )
        if (object)
          gesture.current = {
            kind:
              activeTool === 'Rotate'
                ? 'sketch-rotate'
                : activeTool === 'Scale'
                  ? 'sketch-scale'
                  : 'sketch-move',
            id: selectedSketchId,
            layerId: selectedSketchLayer.id,
            startClient: { x: event.clientX, y: event.clientY },
            startShapes: cloneShapes(object.shapes)
          }
      } else if (selectedPieceId && selectedPieceLayer) {
        gesture.current = {
          kind:
            activeTool === 'Rotate'
              ? 'piece-rotate'
              : activeTool === 'Scale'
                ? 'piece-scale'
                : activeTool === 'Depth'
                  ? 'piece-depth'
                  : 'piece-move',
          id: selectedPieceId,
          layerId: selectedPieceLayer.id,
          startClient: { x: event.clientX, y: event.clientY }
        }
      } else if (currentState.selectedRemainderLayerId) {
        gesture.current = {
          kind:
            activeTool === 'Rotate'
              ? 'remainder-rotate'
              : activeTool === 'Scale'
                ? 'remainder-scale'
                : activeTool === 'Depth'
                  ? 'remainder-depth'
                  : 'remainder-move',
          layerId: currentState.selectedRemainderLayerId,
          startClient: { x: event.clientX, y: event.clientY }
        }
      } else if (selectedLayer) {
        gesture.current = {
          kind:
            activeTool === 'Rotate'
              ? 'layer-rotate'
              : activeTool === 'Scale'
                ? 'layer-scale'
                : activeTool === 'Depth'
                  ? 'layer-depth'
                  : 'layer-move',
          layerId: selectedLayer.id,
          startClient: { x: event.clientX, y: event.clientY },
          transform: { ...selectedLayer.transform },
          depth: selectedLayer.depth
        }
      }

      if (gesture.current) {
        event.currentTarget.setPointerCapture?.(event.pointerId)
        return
      }
    }
    if (clickedLayerId && lockedLayerId && clickedLayerId !== lockedLayerId)
      return

    const activeDrawingType =
      mode === 'sketch'
        ? (
            {
              Rectangle: 'rect',
              Circle: 'circle',
              Line: 'line',
              Pen: 'pen',
              Spline: 'spline'
            } as Partial<Record<EditorTool, CutShape['type']>>
          )[activeTool]
        : undefined
    const editLayerId =
      mode === 'sketch' ? currentState.activeSketchLayerId : lockedLayerId
    const editLayer = currentState.sceneLayers.find(
      (layer) => layer.id === editLayerId
    )

    if (activeDrawingType && editLayer && clickedLayerId === editLayer.id) {
      const point = layerPoint(event, editLayer.id)
      const shape: CutShape = {
        id: 'shape-live',
        type: activeDrawingType,
        points:
          activeDrawingType === 'pen' || activeDrawingType === 'spline'
            ? [point]
            : [point, point],
        closed: activeDrawingType === 'rect' || activeDrawingType === 'circle'
      }
      setLiveShape(shape)
      gesture.current = {
        kind: 'draw',
        layerId: editLayer.id,
        startClient: { x: event.clientX, y: event.clientY },
        startPoint: point
      }
      event.currentTarget.setPointerCapture?.(event.pointerId)
      return
    }

    if (sketchEl && editLayer) {
      const id = sketchEl.dataset.sketchId as string
      const handle = target.closest<SVGElement>('[data-handle]')?.dataset.handle
      const object = editLayer.sketches.find((item) => item.id === id)
      if (!object) return
      toggleSketchSelection(id, event.shiftKey)
      gesture.current = {
        kind:
          handle === 'rotate' || activeTool === 'Rotate'
            ? 'sketch-rotate'
            : handle === 'scale' || activeTool === 'Scale'
              ? 'sketch-scale'
              : 'sketch-move',
        id,
        layerId: editLayer.id,
        startClient: { x: event.clientX, y: event.clientY },
        startShapes: cloneShapes(object.shapes)
      }
      event.currentTarget.setPointerCapture?.(event.pointerId)
      return
    }

    if (mode === 'sketch') return

    const startLayerGesture = (layerId: string) => {
      const layer = currentState.sceneLayers.find((item) => item.id === layerId)
      if (!layer) return false
      const handle = target.closest<SVGElement>('[data-handle]')?.dataset.handle
      gesture.current = {
        kind:
          handle === 'rotate' || activeTool === 'Rotate'
            ? 'layer-rotate'
            : handle === 'scale' || activeTool === 'Scale'
              ? 'layer-scale'
              : activeTool === 'Depth'
                ? 'layer-depth'
                : 'layer-move',
        layerId,
        startClient: { x: event.clientX, y: event.clientY },
        transform: { ...layer.transform },
        depth: layer.depth
      }
      event.currentTarget.setPointerCapture?.(event.pointerId)
      return true
    }

    if (layerControlEl) {
      startLayerGesture(layerControlEl.dataset.layerControlId as string)
      return
    }

    const hasSubObjectSelection =
      Boolean(currentState.selectedRemainderLayerId) ||
      currentState.selectedPieces.length > 0 ||
      currentState.selectedSketchIds.length > 0

    if (pieceEl) {
      const id = pieceEl.dataset.pieceId as string
      const layerId = pieceEl.dataset.layerId as string
      const handle = target.closest<SVGElement>('[data-handle]')?.dataset.handle
      if (!currentState.selectedPieces.includes(id))
        togglePieceSelection(id, event.shiftKey)
      gesture.current = {
        kind:
          handle === 'rotate' || activeTool === 'Rotate'
            ? 'piece-rotate'
            : handle === 'scale' || activeTool === 'Scale'
              ? 'piece-scale'
              : activeTool === 'Depth'
                ? 'piece-depth'
                : 'piece-move',
        id,
        layerId,
        startClient: { x: event.clientX, y: event.clientY }
      }
      event.currentTarget.setPointerCapture?.(event.pointerId)
      return
    }

    if (remainderEl) {
      const layerId = remainderEl.dataset.remainderId as string
      if (currentState.selectedRemainderLayerId === layerId) {
        const handle =
          target.closest<SVGElement>('[data-handle]')?.dataset.handle
        gesture.current = {
          kind:
            handle === 'rotate' || activeTool === 'Rotate'
              ? 'remainder-rotate'
              : handle === 'scale' || activeTool === 'Scale'
                ? 'remainder-scale'
                : activeTool === 'Depth'
                  ? 'remainder-depth'
                  : 'remainder-move',
          layerId,
          startClient: { x: event.clientX, y: event.clientY }
        }
        event.currentTarget.setPointerCapture?.(event.pointerId)
        return
      }
      if (hasSubObjectSelection) {
        if (activeTool === 'Select') selectRemainder(layerId)
        return
      }
      startLayerGesture(layerId)
      return
    }

    if (layerEl && !hasSubObjectSelection) {
      startLayerGesture(layerEl.dataset.canvasLayer as string)
    }
  }
  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const current = gesture.current
    if (!current) return
    event.preventDefault()
    const dx = event.clientX - current.startClient.x,
      dy = event.clientY - current.startClient.y
    if (current.kind === 'orbit') {
      setOrbit({
        x: Math.max(-72, Math.min(72, (current.depth ?? 0) + dy * 0.35)),
        y: Math.max(-72, Math.min(72, (current.transform?.x ?? 0) + dx * 0.35))
      })
      return
    }
    if (
      current.kind === 'draw' &&
      current.layerId &&
      current.startPoint &&
      liveShape
    ) {
      const next = layerPoint(event, current.layerId)
      if (liveShape.type === 'pen' || liveShape.type === 'spline') {
        const last = liveShape.points[liveShape.points.length - 1]
        if (Math.hypot(last.x - next.x, last.y - next.y) > 0.7)
          setLiveShape({ ...liveShape, points: [...liveShape.points, next] })
      } else setLiveShape({ ...liveShape, points: [current.startPoint, next] })
      return
    }
    if (
      current.kind.startsWith('sketch') &&
      current.id &&
      current.layerId &&
      current.startShapes
    ) {
      const element = stageRef.current?.querySelector<HTMLElement>(
        '[data-canvas-layer="' + current.layerId + '"]'
      )
      if (!element) return
      const px = (dx / element.clientWidth) * 100,
        py = (dy / element.clientHeight) * 100
      let shapes = cloneShapes(current.startShapes)
      if (current.kind === 'sketch-move')
        shapes = shapes.map((shape) => ({
          ...shape,
          points: shape.points.map((point) => ({
            x: point.x + px,
            y: point.y + py
          }))
        }))
      if (current.kind === 'sketch-scale') {
        const bounds = shapeBounds(shapes)
        const sx = Math.max(0.08, (bounds.width + px) / bounds.width),
          sy = Math.max(0.08, (bounds.height + py) / bounds.height)
        shapes = shapes.map((shape) => ({
          ...shape,
          points: shape.points.map((point) => ({
            x: bounds.x + (point.x - bounds.x) * sx,
            y: bounds.y + (point.y - bounds.y) * sy
          }))
        }))
      }
      if (current.kind === 'sketch-rotate') {
        const bounds = shapeBounds(shapes),
          radians = dx * 0.012
        shapes = shapes.map((shape) => ({
          ...shape,
          points: shape.points.map((point) => ({
            x:
              bounds.cx +
              (point.x - bounds.cx) * Math.cos(radians) -
              (point.y - bounds.cy) * Math.sin(radians),
            y:
              bounds.cy +
              (point.x - bounds.cx) * Math.sin(radians) +
              (point.y - bounds.cy) * Math.cos(radians)
          }))
        }))
      }
      updateSketchObjectShapes(current.layerId, current.id, shapes)
      return
    }
    if (current.kind === 'remainder-move' && current.layerId) {
      const element = stageRef.current?.querySelector<HTMLElement>(
        '[data-canvas-layer="' + current.layerId + '"]'
      )
      if (element) {
        moveRemainder(
          current.layerId,
          (dx / element.clientWidth) * 100,
          (dy / element.clientHeight) * 100
        )
        current.startClient = { x: event.clientX, y: event.clientY }
      }
    }
    if (current.kind === 'remainder-rotate' && current.layerId) {
      rotateRemainder(current.layerId, dx * 0.45)
      current.startClient.x = event.clientX
    }
    if (current.kind === 'remainder-scale' && current.layerId) {
      scaleRemainder(current.layerId, dx * 0.01, dy * 0.01)
      current.startClient = { x: event.clientX, y: event.clientY }
    }
    if (current.kind === 'remainder-depth' && current.layerId) {
      changeRemainderDepth(current.layerId, dx * 2)
      current.startClient.x = event.clientX
    }
    if (current.kind === 'piece-move' && current.id && current.layerId) {
      const element = stageRef.current?.querySelector<HTMLElement>(
        '[data-canvas-layer="' + current.layerId + '"]'
      )
      if (element) {
        movePiece(
          current.id,
          (dx / element.clientWidth) * 100,
          (dy / element.clientHeight) * 100
        )
        current.startClient = { x: event.clientX, y: event.clientY }
      }
    }
    if (current.kind === 'piece-rotate' && current.id) {
      rotatePiece(current.id, dx * 0.45)
      current.startClient.x = event.clientX
    }
    if (current.kind === 'piece-scale' && current.id) {
      scalePiece(current.id, dx * 0.01, dy * 0.01)
      current.startClient = { x: event.clientX, y: event.clientY }
    }
    if (current.kind === 'piece-depth' && current.id) {
      changePieceDepth(current.id, dx * 2)
      current.startClient.x = event.clientX
    }
    if (current.layerId && current.transform) {
      if (current.kind === 'layer-move') {
        setLayerTransform(current.layerId, 'x', current.transform.x + dx)
        setLayerTransform(current.layerId, 'y', current.transform.y + dy)
      }
      if (current.kind === 'layer-rotate')
        setLayerTransform(
          current.layerId,
          'rotation',
          current.transform.rotation + dx * 0.45
        )
      if (current.kind === 'layer-scale') {
        setLayerTransform(
          current.layerId,
          'width',
          current.transform.width + dx * 0.15
        )
        setLayerTransform(
          current.layerId,
          'height',
          current.transform.height + dy * 0.15
        )
      }
      if (current.kind === 'layer-depth')
        setLayerDepth(current.layerId, (current.depth ?? 0) + dx * 2)
    }
  }
  const onPointerUp = () => {
    if (
      gesture.current?.kind === 'draw' &&
      gesture.current.layerId &&
      liveShape
    ) {
      const enough =
        liveShape.points.length > 1 &&
        Math.hypot(
          liveShape.points[0].x -
            liveShape.points[liveShape.points.length - 1].x,
          liveShape.points[0].y -
            liveShape.points[liveShape.points.length - 1].y
        ) > 0.8
      if (enough || liveShape.points.length > 3) {
        const shape = { ...liveShape, id: 'shape-' + Date.now() }
        const object: SketchObject = {
          id: 'sketch-' + Date.now(),
          name:
            (shape.type === 'circle'
              ? 'Ellipse'
              : shape.type[0].toUpperCase() + shape.type.slice(1)) + ' contour',
          shapes: [shape],
          closed: shape.closed,
          visible: true
        }
        addSketchObject(gesture.current.layerId, object)
      }
    }
    setLiveShape(null)
    gesture.current = null
  }
  const renderSketch = (
    object: SketchObject,
    live = false,
    interactive = true
  ) => (
    <g
      key={object.id}
      data-sketch-id={live ? undefined : object.id}
      className={
        'sketch-object ' +
        (live ? 'live' : '') +
        (selectedSketchIds.includes(object.id) ? ' selected' : '') +
        (!interactive ? ' interaction-disabled' : '')
      }
    >
      {object.shapes.map((shape) => (
        <ShapeGeometry
          key={shape.id}
          shape={shape}
          fill={shape.closed ? 'rgba(232,139,83,.12)' : 'none'}
          stroke={live ? '#ffbd8d' : '#e88750'}
          strokeWidth={1.2}
        />
      ))}
      {!live && selectedSketchIds.includes(object.id) && (
        <SelectionBounds shapes={object.shapes} />
      )}
    </g>
  )
  return (
    <main
      ref={viewportRef}
      className={'viewport layer-viewport ' + mode}
      onDragStart={(event) => event.preventDefault()}
    >
      <WorkspaceToolStrip />
      <div className="viewport-controls">
        <button className={grid ? 'active' : ''} onClick={toggleGrid}>
          <I.Grid3X3 size={15} /> Grid
        </button>
        <button className={safeFrame ? 'active' : ''} onClick={toggleSafe}>
          <I.RectangleHorizontal size={15} /> Safe
        </button>
        {mode === 'stage' && (
          <button onClick={resetOrbit}>
            <I.Rotate3D size={15} /> Reset
          </button>
        )}
        <button aria-label="Zoom out" onClick={zoomOut}>
          <I.Minus size={15} />
        </button>
        <span>{Math.round(visibleZoom * 100)}%</span>
        <button aria-label="Zoom in" onClick={zoomIn}>
          <I.Plus size={15} />
        </button>
        <button onClick={resetZoom}>Fit</button>
      </div>
      <div className="tool-hint">
        <I.MousePointer2 size={14} />
        {mode === 'sketch'
          ? 'Sketch mode · active layer is editable; context layers are frozen'
          : mode === 'stage'
            ? 'Stage · drag to orbit'
            : tool + ' · select or transform paper objects'}
      </div>
      <div
        ref={stageRef}
        className={'layer-stage ' + (grid ? 'with-grid' : '')}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div
          className="stage-orbit"
          style={{
            transform:
              mode === 'stage'
                ? 'scale(' +
                  visibleZoom +
                  ') rotateX(' +
                  orbit.x +
                  'deg) rotateY(' +
                  orbit.y +
                  'deg)'
                : 'scale(' + zoom + ')'
          }}
        >
          {sceneLayers
            .filter((layer) => layer.visible)
            .slice()
            .sort((a, b) => a.depth - b.depth)
            .map((layer) => {
              const transform = layer.transform
              const contextLayer =
                mode === 'sketch' && layer.id !== activeSketchLayerId
              const selectedPieceOnLayer = layer.pieces.some((piece) =>
                selectedPieces.includes(piece.id)
              )
              const selectedSketchOnLayer = layer.sketches.some((sketch) =>
                selectedSketchIds.includes(sketch.id)
              )
              const selectedRemainderOnLayer =
                selectedRemainderLayerId === layer.id
              const hasSubObjectSelection =
                selectedPieceOnLayer ||
                selectedSketchOnLayer ||
                selectedRemainderOnLayer
              const logicalLayerSelected =
                selected === layer.id && !hasSubObjectSelection
              const layerIsInteractive = layer.id === interactionLayerId
              return (
                <div
                  data-canvas-layer={layer.id}
                  key={layer.id}
                  className={
                    'paper-layer ' +
                    (selected === layer.id ? 'selected ' : '') +
                    (contextLayer ? 'context-layer' : '')
                  }
                  style={{
                    width: transform.width + '%',
                    height: transform.height + '%',
                    opacity: contextLayer ? 0.18 : transform.opacity / 100,
                    pointerEvents:
                      mode !== 'stage' && !layerIsInteractive ? 'none' : 'auto',
                    transform:
                      mode === 'stage'
                        ? 'translate(-50%, -50%) translate3d(' +
                          transform.x +
                          'px,' +
                          transform.y +
                          'px,' +
                          layer.depth +
                          'px) rotateZ(' +
                          transform.rotation +
                          'deg)'
                        : 'translate(-50%, -50%) translate(' +
                          transform.x +
                          'px,' +
                          transform.y +
                          'px) rotate(' +
                          transform.rotation +
                          'deg)'
                  }}
                >
                  <PaperSurface layer={layer} />
                  <svg
                    className="object-overlay"
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                  >
                    <defs>
                      <pattern
                        id={'object-paper-' + layer.id}
                        width="100"
                        height="100"
                        patternUnits="userSpaceOnUse"
                      >
                        <image
                          href={paperTexture}
                          width="100"
                          height="100"
                          preserveAspectRatio="xMidYMid slice"
                        />
                      </pattern>
                    </defs>
                    <g
                      data-remainder-id={layer.id}
                      className={
                        'sheet-hit ' +
                        (selectedRemainderOnLayer ? 'selected' : '')
                      }
                      style={{
                        pointerEvents:
                          tool === 'Select' ||
                          !hasSubObjectSelection ||
                          selectedRemainderOnLayer
                            ? 'all'
                            : 'none'
                      }}
                      transform={
                        'translate(' +
                        layer.sheetTransform.x +
                        ' ' +
                        layer.sheetTransform.y +
                        ') rotate(' +
                        layer.sheetTransform.rotation +
                        ' 50 50) translate(50 50) scale(' +
                        layer.sheetTransform.scaleX +
                        ' ' +
                        layer.sheetTransform.scaleY +
                        ') translate(-50 -50)'
                      }
                    >
                      <rect width="100" height="100" fill="transparent" />
                      {selectedRemainderLayerId === layer.id && (
                        <SelectionBounds
                          shapes={[
                            {
                              id: 'sheet-bounds',
                              type: 'rect',
                              closed: true,
                              points: [
                                { x: 0, y: 0 },
                                { x: 100, y: 100 }
                              ]
                            }
                          ]}
                        />
                      )}
                    </g>
                    {layer.pieces
                      .filter((piece) => piece.visible)
                      .sort((a, b) => a.depthOffset - b.depthOffset)
                      .map((piece) => {
                        const bounds = shapeBounds(piece.shapes)
                        return (
                          <g
                            data-piece-id={piece.id}
                            data-layer-id={layer.id}
                            key={piece.id}
                            className={
                              'cut-object ' +
                              (selectedPieces.includes(piece.id)
                                ? 'selected'
                                : '')
                            }
                            style={{
                              pointerEvents:
                                tool === 'Select' ||
                                !hasSubObjectSelection ||
                                selectedPieces.includes(piece.id)
                                  ? 'all'
                                  : 'none',
                              filter: selectedPieces.includes(piece.id)
                                ? 'drop-shadow(0 0 1px #fff) drop-shadow(0 ' +
                                  Math.max(1, piece.depthOffset / 6) +
                                  'px ' +
                                  Math.max(2, Math.abs(piece.depthOffset) / 8) +
                                  'px rgba(0,0,0,.58))'
                                : 'drop-shadow(0 ' +
                                  Math.max(1, piece.depthOffset / 6) +
                                  'px ' +
                                  Math.max(1, Math.abs(piece.depthOffset) / 8) +
                                  'px rgba(0,0,0,.48))'
                            }}
                            transform={
                              'translate(' +
                              piece.x +
                              ' ' +
                              piece.y +
                              ') rotate(' +
                              piece.rotation +
                              ' ' +
                              bounds.cx +
                              ' ' +
                              bounds.cy +
                              ') scale(' +
                              piece.scaleX +
                              ' ' +
                              piece.scaleY +
                              ')'
                            }
                          >
                            {piece.shapes.map((shape) => (
                              <g key={shape.id}>
                                <ShapeGeometry
                                  shape={shape}
                                  fill={'url(#object-paper-' + layer.id + ')'}
                                  stroke="rgba(255,255,255,.12)"
                                  strokeWidth={0.25}
                                />
                                <g
                                  opacity=".66"
                                  style={{ mixBlendMode: 'multiply' }}
                                >
                                  <ShapeGeometry
                                    shape={shape}
                                    fill={layer.color}
                                    stroke="none"
                                    strokeWidth={0}
                                  />
                                </g>
                              </g>
                            ))}
                            {selectedPieces.includes(piece.id) && (
                              <SelectionBounds shapes={piece.shapes} />
                            )}
                          </g>
                        )
                      })}
                    {(mode === 'sketch' || mode === 'compose') &&
                      layer.id === interactionLayerId &&
                      layer.sketches
                        .filter((object) => object.visible)
                        .map((object) =>
                          renderSketch(
                            object,
                            false,
                            tool === 'Select' ||
                              !hasSubObjectSelection ||
                              selectedSketchIds.includes(object.id)
                          )
                        )}
                    {(mode === 'sketch' || mode === 'compose') &&
                      layer.id === interactionLayerId &&
                      liveShape &&
                      renderSketch(
                        {
                          id: 'live',
                          name: 'Drawing',
                          shapes: [liveShape],
                          closed: liveShape.closed,
                          visible: true
                        },
                        true
                      )}
                    {mode === 'compose' && logicalLayerSelected && (
                      <g data-layer-control-id={layer.id}>
                        <SelectionBounds
                          shapes={[
                            {
                              id: 'layer-bounds',
                              type: 'rect',
                              closed: true,
                              points: [
                                { x: 0, y: 0 },
                                { x: 100, y: 100 }
                              ]
                            }
                          ]}
                        />
                      </g>
                    )}
                  </svg>
                  {mode === 'stage' && <em>{layer.depth}px</em>}
                </div>
              )
            })}
        </div>
        {safeFrame && <div className="safe-frame" />}
        {mode === 'stage' && <div className="stage-grid" />}
      </div>
    </main>
  )
}

function Inspector() {
  const { selected, sceneLayers, material, setLayerTransform, setLayerDepth } =
    useUIStore()
  const layer = sceneLayers.find((item) => item.id === selected)
  const transform = layer?.transform
  const update = (
    field: keyof NonNullable<typeof transform>,
    value: string
  ) => {
    if (layer && value.trim() !== '' && Number.isFinite(Number(value)))
      setLayerTransform(layer.id, field, Number(value))
  }
  return (
    <aside className="inspector">
      <div className="inspector-title">
        <span>INSPECTOR</span>
        <strong>{layer?.name ?? 'Object selection'}</strong>
      </div>
      <Section id="transform" title="Transform">
        <div className="properties">
          <Property
            key={(layer?.id ?? selected) + '-x'}
            label="X"
            value={transform?.x ?? 0}
            keyId="x"
            onChange={(value) => update('x', value)}
          />
          <Property
            key={(layer?.id ?? selected) + '-y'}
            label="Y"
            value={transform?.y ?? 0}
            keyId="y"
            onChange={(value) => update('y', value)}
          />
          <Property
            key={(layer?.id ?? selected) + '-depth'}
            label="Depth"
            value={layer?.depth ?? 0}
            keyId="depth"
            onChange={(value) => {
              if (
                layer &&
                value.trim() !== '' &&
                Number.isFinite(Number(value))
              )
                setLayerDepth(layer.id, Number(value))
            }}
          />
          <Property
            key={(layer?.id ?? selected) + '-rotation'}
            label="Rotation"
            value={transform?.rotation ?? 0}
            keyId="rotation"
            onChange={(value) => update('rotation', value)}
          />
          <Property
            key={(layer?.id ?? selected) + '-width'}
            label="Width"
            value={transform?.width ?? 100}
            onChange={(value) => update('width', value)}
          />
          <Property
            key={(layer?.id ?? selected) + '-height'}
            label="Height"
            value={transform?.height ?? 100}
            onChange={(value) => update('height', value)}
          />
          <Property
            key={(layer?.id ?? selected) + '-opacity'}
            label="Opacity"
            value={transform?.opacity ?? 100}
            onChange={(value) => update('opacity', value)}
          />
        </div>
      </Section>
      <Section id="layer" title="Layer">
        <div className="properties">
          <Property
            label="Logical layer"
            value={layer?.name ?? 'Select a layer'}
          />
          <Property label="Local depth" value={layer?.depth ?? 0} />
        </div>
      </Section>
      <Section id="material" title="Material">
        <div className="material-preview">
          <span />
          <div>
            <strong>{material}</strong>
            <small>Paper PBR · color tint</small>
          </div>
        </div>
      </Section>
    </aside>
  )
}

function Timeline() {
  const {
    time,
    setTime,
    playing,
    togglePlaying,
    selected,
    selectedPieces,
    sceneLayers,
    select,
    selectLayer,
    togglePieceSelection
  } = useUIStore()
  const timelineTracks = [
    { id: 'camera', label: 'Camera', kind: 'camera' as const },
    ...sceneLayers.flatMap((layer) => [
      { id: layer.id, label: layer.name, kind: 'layer' as const },
      ...layer.pieces.map((piece) => ({
        id: piece.id,
        label: piece.name,
        kind: 'piece' as const
      }))
    ])
  ]
  return (
    <section className="timeline">
      <div className="resize-handle" />
      <div className="timeline-top">
        <div className="transport">
          <IconButton label="Go to start">
            <I.SkipBack size={15} />
          </IconButton>
          <IconButton label="Previous frame">
            <I.StepBack size={15} />
          </IconButton>
          <IconButton label="Play" onClick={togglePlaying}>
            {playing ? <I.Pause size={16} /> : <I.Play size={16} />}
          </IconButton>
          <IconButton label="Next frame">
            <I.StepForward size={15} />
          </IconButton>
          <IconButton label="Go to end">
            <I.SkipForward size={15} />
          </IconButton>
        </div>
        <strong>{time.toFixed(2)}s</strong>
        <div className="timeline-meta">
          <span>30 FPS</span>
          <span>
            Duration 12s <small>/ max 30s</small>
          </span>
        </div>
      </div>
      <div className="timeline-body">
        <div className="track-list">
          {timelineTracks.map((track) => (
            <button
              key={track.id}
              className={
                selected === track.id || selectedPieces.includes(track.id)
                  ? 'selected'
                  : ''
              }
              onClick={() => {
                if (track.kind === 'layer') selectLayer(track.id)
                else if (track.kind === 'piece')
                  togglePieceSelection(track.id, false)
                else select(track.id)
              }}
            >
              <I.ChevronRight size={13} />
              {track.label}
            </button>
          ))}
        </div>
        <div
          className="ruler-area"
          onClick={(event) => {
            const rect = event.currentTarget.getBoundingClientRect()
            setTime(((event.clientX - rect.left) / rect.width) * 12)
          }}
        >
          <div className="ruler">
            {Array.from({ length: 13 }, (_, index) => (
              <span key={index} style={{ left: (index / 12) * 100 + '%' }}>
                {index}s
              </span>
            ))}
          </div>
          <div className="playhead" style={{ left: (time / 12) * 100 + '%' }}>
            <b />
          </div>
        </div>
      </div>
    </section>
  )
}

function Dialog({ children }: { children: ReactNode }) {
  const { dialog, setDialog } = useUIStore()
  if (!dialog) return null
  const title = {
    new: 'New Project',
    import: 'Import Artwork',
    preview: 'Preview',
    export: 'Export',
    shortcuts: 'Keyboard Shortcuts',
    delete: 'Delete selected object?'
  }[dialog]
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label={title}>
      <div className="dialog">
        <div className="dialog-head">
          <h2>{title}</h2>
          <IconButton label="Close dialog" onClick={() => setDialog(null)}>
            <I.X size={18} />
          </IconButton>
        </div>
        {children}
        <div className="dialog-actions">
          <button onClick={() => setDialog(null)}>Close</button>
        </div>
      </div>
    </div>
  )
}
function Dialogs() {
  const { dialog } = useUIStore()
  if (!dialog) return null
  if (dialog === 'preview')
    return (
      <Dialog>
        <div className="preview-scene">
          <div className="sun" />
          <div className="hill back-hill" />
          <div className="hill near-hill" />
        </div>
      </Dialog>
    )
  if (dialog === 'export')
    return (
      <Dialog>
        <p>Export formats are coming in a later phase.</p>
      </Dialog>
    )
  if (dialog === 'shortcuts')
    return (
      <Dialog>
        <div className="shortcuts">
          <div>
            <kbd>1 / 2 / 3</kbd>
            <span>Compose / Sketch / Stage</span>
          </div>
          <div>
            <kbd>V</kbd>
            <span>Select</span>
          </div>
          <div>
            <kbd>R</kbd>
            <span>Rotate</span>
          </div>
          <div>
            <kbd>S</kbd>
            <span>Scale</span>
          </div>
          <div>
            <kbd>C</kbd>
            <span>Cut selected contour</span>
          </div>
        </div>
      </Dialog>
    )
  return (
    <Dialog>
      <EmptyState
        title="Prototype dialog"
        text="This workflow is represented as UI only."
      />
    </Dialog>
  )
}

export function App() {
  const {
    mode,
    setMode,
    setTool,
    saveProject,
    selectedPieces,
    selectedSketchIds,
    deleteSelectedPieces,
    deleteSelectedSketches,
    cutSelectedContours,
    joinSelectedPieces,
    setDialog,
    togglePlaying
  } = useUIStore()
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault()
        saveProject()
        return
      }
      if (target?.matches('input, textarea, select, [contenteditable=true]'))
        return
      if (event.key === 'Backspace' || event.key === 'Delete') {
        event.preventDefault()
        if (mode === 'sketch' && selectedSketchIds.length)
          deleteSelectedSketches()
        else if (selectedPieces.length) deleteSelectedPieces()
        else setDialog('delete')
      }
      if (event.key === '1') setMode('compose')
      if (event.key === '2') setMode('sketch')
      if (event.key === '3') setMode('stage')
      if (event.key === ' ') {
        event.preventDefault()
        togglePlaying()
      }
      const shortcuts: Record<string, EditorTool> = {
        v: 'Select',
        r: 'Rotate',
        s: 'Scale',
        d: 'Depth',
        p: 'Pen'
      }
      if (shortcuts[event.key.toLowerCase()])
        setTool(shortcuts[event.key.toLowerCase()])
      if (event.key.toLowerCase() === 'c' && mode === 'sketch')
        cutSelectedContours()
      if (event.key.toLowerCase() === 'j') joinSelectedPieces()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [
    mode,
    selectedPieces,
    selectedSketchIds,
    saveProject,
    deleteSelectedPieces,
    deleteSelectedSketches,
    setDialog,
    setMode,
    setTool,
    togglePlaying,
    cutSelectedContours,
    joinSelectedPieces
  ])
  return (
    <div className="app">
      <div className="too-small">
        <I.Monitor size={28} />
        <strong>Papercut works best on a larger screen.</strong>
        <span>Please use a viewport at least 1100px wide.</span>
      </div>
      <div className="editor">
        <TopToolbar />
        <div className="workspace">
          <LayerHierarchy />
          <Scene />
          <Inspector />
        </div>
        <Timeline />
      </div>
      <Dialogs />
    </div>
  )
}
