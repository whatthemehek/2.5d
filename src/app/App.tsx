import {
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
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
            ? 'Drag selection · corners scale · top handle rotates'
            : 'Draw, or double-click a contour to select it'
          : 'Double-click to select · drag to move · corners scale · top handle rotates'}
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

function screenSpaceMatrix({
  x,
  y,
  rotation,
  scaleX,
  scaleY,
  cx,
  cy,
  aspect
}: {
  x: number
  y: number
  rotation: number
  scaleX: number
  scaleY: number
  cx: number
  cy: number
  aspect: number
}) {
  const safeAspect = Math.max(0.01, aspect)
  const radians = (rotation * Math.PI) / 180
  const cosine = Math.cos(radians)
  const sine = Math.sin(radians)
  const a = cosine * scaleX
  const b = sine * scaleX * safeAspect
  const c = (-sine * scaleY) / safeAspect
  const d = cosine * scaleY
  const e = x + cx - a * cx - c * cy
  const f = y + cy - b * cx - d * cy
  return `matrix(${a} ${b} ${c} ${d} ${e} ${f})`
}

function materializePrimitive(shape: CutShape): CutShape {
  const first = shape.points[0]
  const last = shape.points[shape.points.length - 1]
  if (!first || !last) return shape
  if (shape.type === 'rect') {
    const left = Math.min(first.x, last.x)
    const right = Math.max(first.x, last.x)
    const top = Math.min(first.y, last.y)
    const bottom = Math.max(first.y, last.y)
    return {
      ...shape,
      type: 'pen',
      closed: true,
      points: [
        { x: left, y: top },
        { x: right, y: top },
        { x: right, y: bottom },
        { x: left, y: bottom }
      ]
    }
  }
  if (shape.type === 'circle') {
    const cx = (first.x + last.x) / 2
    const cy = (first.y + last.y) / 2
    const rx = Math.abs(last.x - first.x) / 2
    const ry = Math.abs(last.y - first.y) / 2
    return {
      ...shape,
      type: 'pen',
      closed: true,
      points: Array.from({ length: 48 }, (_, index) => {
        const radians = (index / 48) * Math.PI * 2
        return {
          x: cx + Math.cos(radians) * rx,
          y: cy + Math.sin(radians) * ry
        }
      })
    }
  }
  return shape
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

function PaperSurface({ layer, aspect }: { layer: Layer; aspect: number }) {
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
        transform={screenSpaceMatrix({
          x: sheet.x,
          y: sheet.y,
          rotation: sheet.rotation,
          scaleX: sheet.scaleX,
          scaleY: sheet.scaleY,
          cx: 50,
          cy: 50,
          aspect
        })}
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

function SelectionBounds({
  shapes,
  ownerId
}: {
  shapes: CutShape[]
  ownerId: string
}) {
  const bounds = shapeBounds(shapes)
  const left = bounds.x <= 0 ? 1 : bounds.x - 1
  const top = bounds.y <= 0 ? 1 : bounds.y - 1
  const right =
    bounds.x + bounds.width >= 100 ? 99 : bounds.x + bounds.width + 1
  const bottom =
    bounds.y + bounds.height >= 100 ? 99 : bounds.y + bounds.height + 1
  const rotateLineY = top - 6
  const rotateY = top - 7
  return (
    <g className="vector-selection" data-selection-owner={ownerId}>
      <rect x={left} y={top} width={right - left} height={bottom - top} />
      {[
        [left, top, 'nw'],
        [right, top, 'ne'],
        [left, bottom, 'sw'],
        [right, bottom, 'se']
      ].map(([x, y, position]) => (
        <rect
          data-handle="scale"
          data-handle-position={position}
          className="vector-handle"
          key={position}
          x={Number(x) - 1.5}
          y={Number(y) - 1.5}
          width="3"
          height="3"
        />
      ))}
      <line x1={bounds.cx} y1={top} x2={bounds.cx} y2={rotateLineY} />
      <circle
        data-handle="rotate"
        className="rotate-handle"
        cx={bounds.cx}
        cy={rotateY}
        r="1.8"
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
  handlePosition?: string
  pointerStart?: SketchPoint
  centerClient?: SketchPoint
  startPointerAngle?: number
  scaleBasis?: {
    fixed: SketchPoint
    xUnit: SketchPoint
    yUnit: SketchPoint
    width: number
    height: number
  }
  objectTransform?: {
    x: number
    y: number
    rotation: number
    scaleX: number
    scaleY: number
    aspect: number
    bounds: ReturnType<typeof shapeBounds>
  }
}

const oppositeCorner: Record<string, string> = {
  nw: 'se',
  ne: 'sw',
  sw: 'ne',
  se: 'nw'
}

const scaleCornerBasis: Record<
  string,
  { fixed: string; x: string; y: string }
> = {
  nw: { fixed: 'se', x: 'sw', y: 'ne' },
  ne: { fixed: 'sw', x: 'se', y: 'nw' },
  sw: { fixed: 'ne', x: 'nw', y: 'se' },
  se: { fixed: 'nw', x: 'ne', y: 'sw' }
}

function handleCenter(owner: Element, position: string) {
  const handle = owner.querySelector<SVGElement>(
    '[data-handle-position="' + position + '"]'
  )
  const rect = handle?.getBoundingClientRect()
  if (!rect || (rect.width === 0 && rect.height === 0)) return null
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
}

function directGestureGeometry(
  owner: Element,
  event: ReactPointerEvent,
  handle: string | undefined,
  handlePosition: string | undefined
) {
  const nw = handleCenter(owner, 'nw')
  const se = handleCenter(owner, 'se')
  const centerClient =
    nw && se ? { x: (nw.x + se.x) / 2, y: (nw.y + se.y) / 2 } : undefined
  const rotation =
    handle === 'rotate' && centerClient
      ? {
          centerClient,
          startPointerAngle: Math.atan2(
            event.clientY - centerClient.y,
            event.clientX - centerClient.x
          )
        }
      : {}
  if (handle !== 'scale' || !handlePosition) return rotation
  const map = scaleCornerBasis[handlePosition]
  if (!map) return rotation
  const fixed = handleCenter(owner, map.fixed)
  const xPoint = handleCenter(owner, map.x)
  const yPoint = handleCenter(owner, map.y)
  if (!fixed || !xPoint || !yPoint) return rotation
  const xVector = { x: xPoint.x - fixed.x, y: xPoint.y - fixed.y }
  const yVector = { x: yPoint.x - fixed.x, y: yPoint.y - fixed.y }
  const width = Math.hypot(xVector.x, xVector.y)
  const height = Math.hypot(yVector.x, yVector.y)
  if (width < 1 || height < 1) return rotation
  return {
    ...rotation,
    scaleBasis: {
      fixed,
      xUnit: { x: xVector.x / width, y: xVector.y / width },
      yUnit: { x: yVector.x / height, y: yVector.y / height },
      width,
      height
    }
  }
}

function rotationGestureDelta(
  current: Gesture,
  event: ReactPointerEvent,
  fallbackDx: number
) {
  if (!current.centerClient || current.startPointerAngle === undefined)
    return fallbackDx * 0.45
  const angle = Math.atan2(
    event.clientY - current.centerClient.y,
    event.clientX - current.centerClient.x
  )
  let degrees = ((angle - current.startPointerAngle) * 180) / Math.PI
  if (degrees > 180) degrees -= 360
  if (degrees < -180) degrees += 360
  return degrees
}

function gestureScaleRatios(current: Gesture, event: ReactPointerEvent) {
  const basis = current.scaleBasis
  if (!basis) return null
  const vector = {
    x: event.clientX - basis.fixed.x,
    y: event.clientY - basis.fixed.y
  }
  const projectedWidth = vector.x * basis.xUnit.x + vector.y * basis.xUnit.y
  const projectedHeight = vector.x * basis.yUnit.x + vector.y * basis.yUnit.y
  return {
    x: Math.max(0.08, Math.min(8, projectedWidth / basis.width)),
    y: Math.max(0.08, Math.min(8, projectedHeight / basis.height))
  }
}

function fixedCornerPoint(
  bounds: ReturnType<typeof shapeBounds>,
  draggedCorner: string | undefined
) {
  const fixed = oppositeCorner[draggedCorner ?? 'se'] ?? 'nw'
  return {
    x: fixed.includes('w') ? bounds.x : bounds.x + bounds.width,
    y: fixed.includes('n') ? bounds.y : bounds.y + bounds.height
  }
}

function transformedOffset(
  point: SketchPoint,
  transform: NonNullable<Gesture['objectTransform']>,
  scaleX = transform.scaleX,
  scaleY = transform.scaleY
) {
  const radians = (transform.rotation * Math.PI) / 180
  const cosine = Math.cos(radians)
  const sine = Math.sin(radians)
  const localX = point.x - transform.bounds.cx
  const localY = point.y - transform.bounds.cy
  return {
    x: cosine * scaleX * localX - (sine * scaleY * localY) / transform.aspect,
    y: sine * scaleX * transform.aspect * localX + cosine * scaleY * localY
  }
}

function Scene() {
  const {
    mode,
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
    setTool,
    selectLayer,
    selectRemainder,
    moveRemainder,
    rotateRemainder,
    scaleRemainder,
    selectedRemainderLayerId,
    toggleSketchSelection,
    togglePieceSelection,
    addSketchObject,
    updateSketchObjectShapes,
    setLayerTransform,
    movePiece,
    rotatePiece,
    scalePiece
  } = useUIStore()
  const viewportRef = useRef<HTMLElement | null>(null)
  const stageRef = useRef<HTMLDivElement | null>(null)
  const gesture = useRef<Gesture | null>(null)
  const [liveShape, setLiveShape] = useState<CutShape | null>(null)
  const [stageSize, setStageSize] = useState({ width: 800, height: 550 })
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
  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const updateSize = () => {
      const rect = stage.getBoundingClientRect()
      if (rect.width > 0 && rect.height > 0)
        setStageSize({ width: rect.width, height: rect.height })
    }
    updateSize()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(updateSize)
    observer.observe(stage)
    return () => observer.disconnect()
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
  const activePieceId = selectedPieces[selectedPieces.length - 1]
  const activeSketchId = selectedSketchIds[selectedSketchIds.length - 1]
  const hasDirectObjectSelection = Boolean(
    selectedRemainderLayerId || activePieceId || activeSketchId
  )
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
  const clientPointForLayer = (
    clientX: number,
    clientY: number,
    layerId: string
  ) => {
    const element = stageRef.current?.querySelector<HTMLElement>(
      '[data-canvas-layer="' + layerId + '"]'
    )
    const svg = element?.querySelector<SVGSVGElement>('.object-overlay')
    const matrix =
      svg && typeof svg.getScreenCTM === 'function' ? svg.getScreenCTM() : null
    if (svg && matrix && typeof svg.createSVGPoint === 'function') {
      const point = svg.createSVGPoint()
      point.x = clientX
      point.y = clientY
      const local = point.matrixTransform(matrix.inverse())
      return { x: local.x, y: local.y }
    }
    const rect = element?.getBoundingClientRect()
    if (rect && rect.width > 0 && rect.height > 0)
      return {
        x: ((clientX - rect.left) / rect.width) * 100,
        y: ((clientY - rect.top) / rect.height) * 100
      }
    return null
  }
  const cloneShapes = (shapes: CutShape[]) =>
    shapes.map((shape) => ({
      ...shape,
      points: shape.points.map((point) => ({ ...point }))
    }))
  const onDoubleClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (mode === 'stage') return
    event.preventDefault()
    event.stopPropagation()
    const target = event.target as Element
    const pieceEl = target.closest<SVGElement>('[data-piece-id]')
    const sketchEl = target.closest<SVGElement>('[data-sketch-id]')
    const remainderEl = target.closest<SVGElement>('[data-remainder-id]')
    const layerEl = target.closest<HTMLElement>('[data-canvas-layer]')
    if (pieceEl) {
      togglePieceSelection(pieceEl.dataset.pieceId as string, event.shiftKey)
      return
    }
    if (sketchEl) {
      toggleSketchSelection(sketchEl.dataset.sketchId as string, event.shiftKey)
      setTool('Select')
      return
    }
    if (remainderEl) {
      selectRemainder(remainderEl.dataset.remainderId as string)
      return
    }
    if (layerEl) selectLayer(layerEl.dataset.canvasLayer as string)
  }
  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement
    const currentState = useUIStore.getState()
    const activeTool = currentState.tool
    if (mode === 'stage') {
      event.preventDefault()
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
    if (clickedLayerId && lockedLayerId && clickedLayerId !== lockedLayerId)
      return

    const handle = target.closest<SVGElement>('[data-handle]')?.dataset.handle
    const handlePosition =
      target.closest<SVGElement>('[data-handle]')?.dataset.handlePosition
    const capture = () => {
      event.currentTarget.setPointerCapture?.(event.pointerId)
    }

    if (sketchEl) {
      const id = sketchEl.dataset.sketchId as string
      const layerId = layerEl?.dataset.canvasLayer as string
      const layer = currentState.sceneLayers.find((item) => item.id === layerId)
      const object = layer?.sketches.find((item) => item.id === id)
      if (
        !object ||
        currentState.selectedSketchIds[
          currentState.selectedSketchIds.length - 1
        ] !== id
      )
        return
      gesture.current = {
        kind:
          handle === 'rotate'
            ? 'sketch-rotate'
            : handle === 'scale'
              ? 'sketch-scale'
              : 'sketch-move',
        id,
        layerId,
        startClient: { x: event.clientX, y: event.clientY },
        startShapes: cloneShapes(object.shapes),
        handlePosition,
        pointerStart:
          clientPointForLayer(event.clientX, event.clientY, layerId) ??
          undefined,
        ...directGestureGeometry(sketchEl, event, handle, handlePosition)
      }
      capture()
      return
    }

    if (pieceEl) {
      const id = pieceEl.dataset.pieceId as string
      if (
        currentState.selectedPieces[currentState.selectedPieces.length - 1] !==
        id
      )
        return
      const layerId = pieceEl.dataset.layerId as string
      const layer = currentState.sceneLayers.find((item) => item.id === layerId)
      const piece = layer?.pieces.find((item) => item.id === id)
      const element = stageRef.current?.querySelector<HTMLElement>(
        '[data-canvas-layer="' + layerId + '"]'
      )
      if (!piece || !layer) return
      gesture.current = {
        kind:
          handle === 'rotate'
            ? 'piece-rotate'
            : handle === 'scale'
              ? 'piece-scale'
              : 'piece-move',
        id,
        layerId,
        startClient: { x: event.clientX, y: event.clientY },
        handlePosition,
        pointerStart:
          clientPointForLayer(event.clientX, event.clientY, layerId) ??
          undefined,
        objectTransform: {
          x: piece.x,
          y: piece.y,
          rotation: piece.rotation,
          scaleX: piece.scaleX,
          scaleY: piece.scaleY,
          aspect: Math.max(
            0.01,
            (element?.clientWidth || 1) / (element?.clientHeight || 1)
          ),
          bounds: shapeBounds(piece.shapes)
        },
        ...directGestureGeometry(pieceEl, event, handle, handlePosition)
      }
      capture()
      return
    }

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
      capture()
      return
    }

    if (mode === 'sketch') return

    const startLayerGesture = (layerId: string, owner: Element) => {
      const layer = currentState.sceneLayers.find((item) => item.id === layerId)
      if (!layer) return false
      gesture.current = {
        kind:
          handle === 'rotate'
            ? 'layer-rotate'
            : handle === 'scale'
              ? 'layer-scale'
              : 'layer-move',
        layerId,
        startClient: { x: event.clientX, y: event.clientY },
        transform: { ...layer.transform },
        depth: layer.depth,
        handlePosition,
        ...directGestureGeometry(owner, event, handle, handlePosition)
      }
      capture()
      return true
    }

    if (layerControlEl) {
      startLayerGesture(
        layerControlEl.dataset.layerControlId as string,
        layerControlEl
      )
      return
    }

    const hasSubObjectSelection =
      Boolean(currentState.selectedRemainderLayerId) ||
      currentState.selectedPieces.length > 0 ||
      currentState.selectedSketchIds.length > 0

    if (remainderEl) {
      const layerId = remainderEl.dataset.remainderId as string
      if (currentState.selectedRemainderLayerId === layerId) {
        const layer = currentState.sceneLayers.find(
          (item) => item.id === layerId
        )
        const element = stageRef.current?.querySelector<HTMLElement>(
          '[data-canvas-layer="' + layerId + '"]'
        )
        if (!layer) return
        gesture.current = {
          kind:
            handle === 'rotate'
              ? 'remainder-rotate'
              : handle === 'scale'
                ? 'remainder-scale'
                : 'remainder-move',
          layerId,
          startClient: { x: event.clientX, y: event.clientY },
          handlePosition,
          pointerStart:
            clientPointForLayer(event.clientX, event.clientY, layerId) ??
            undefined,
          objectTransform: {
            x: layer.sheetTransform.x,
            y: layer.sheetTransform.y,
            rotation: layer.sheetTransform.rotation,
            scaleX: layer.sheetTransform.scaleX,
            scaleY: layer.sheetTransform.scaleY,
            aspect: Math.max(
              0.01,
              (element?.clientWidth || 1) / (element?.clientHeight || 1)
            ),
            bounds: {
              x: 0,
              y: 0,
              width: 100,
              height: 100,
              cx: 50,
              cy: 50
            }
          },
          ...directGestureGeometry(remainderEl, event, handle, handlePosition)
        }
        capture()
        return
      }
      if (!hasSubObjectSelection && currentState.selected === layerId)
        startLayerGesture(layerId, layerEl ?? remainderEl)
      return
    }

    if (
      layerEl &&
      !hasSubObjectSelection &&
      currentState.selected === layerEl.dataset.canvasLayer
    ) {
      startLayerGesture(layerEl.dataset.canvasLayer as string, layerEl)
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
    const localDelta = (layerId: string) => {
      const point = clientPointForLayer(event.clientX, event.clientY, layerId)
      if (point && current.pointerStart)
        return {
          x: point.x - current.pointerStart.x,
          y: point.y - current.pointerStart.y
        }
      const element = stageRef.current?.querySelector<HTMLElement>(
        '[data-canvas-layer="' + layerId + '"]'
      )
      return {
        x: (dx / (element?.clientWidth || 1)) * 100,
        y: (dy / (element?.clientHeight || 1)) * 100
      }
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
      const delta = localDelta(current.layerId)
      const px = delta.x,
        py = delta.y
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
        const fromWest = current.handlePosition?.includes('w')
        const fromNorth = current.handlePosition?.includes('n')
        const ratios = gestureScaleRatios(current, event)
        const sx =
            ratios?.x ??
            Math.max(
              0.08,
              (bounds.width + (fromWest ? -px : px)) / bounds.width
            ),
          sy =
            ratios?.y ??
            Math.max(
              0.08,
              (bounds.height + (fromNorth ? -py : py)) / bounds.height
            ),
          anchorX = fromWest ? bounds.x + bounds.width : bounds.x,
          anchorY = fromNorth ? bounds.y + bounds.height : bounds.y
        shapes = shapes.map((shape) => ({
          ...shape,
          points: shape.points.map((point) => ({
            x: anchorX + (point.x - anchorX) * sx,
            y: anchorY + (point.y - anchorY) * sy
          }))
        }))
      }
      if (current.kind === 'sketch-rotate') {
        shapes = shapes.map(materializePrimitive)
        const bounds = shapeBounds(shapes),
          radians = (rotationGestureDelta(current, event, dx) * Math.PI) / 180,
          aspect = Math.max(
            0.01,
            (element.clientWidth || 1) / (element.clientHeight || 1)
          )
        shapes = shapes.map((shape) => ({
          ...shape,
          points: shape.points.map((point) => {
            const screenX = (point.x - bounds.cx) * aspect
            const screenY = point.y - bounds.cy
            return {
              x:
                bounds.cx +
                (screenX * Math.cos(radians) - screenY * Math.sin(radians)) /
                  aspect,
              y:
                bounds.cy +
                screenX * Math.sin(radians) +
                screenY * Math.cos(radians)
            }
          })
        }))
      }
      updateSketchObjectShapes(current.layerId, current.id, shapes)
      return
    }
    if (current.kind === 'remainder-move' && current.layerId) {
      const start = current.objectTransform
      const layer = useUIStore
        .getState()
        .sceneLayers.find((item) => item.id === current.layerId)
      if (start && layer) {
        const delta = localDelta(current.layerId)
        moveRemainder(
          current.layerId,
          start.x + delta.x - layer.sheetTransform.x,
          start.y + delta.y - layer.sheetTransform.y
        )
      }
    }
    if (current.kind === 'remainder-rotate' && current.layerId) {
      const start = current.objectTransform
      const layer = useUIStore
        .getState()
        .sceneLayers.find((item) => item.id === current.layerId)
      if (start && layer)
        rotateRemainder(
          current.layerId,
          start.rotation +
            rotationGestureDelta(current, event, dx) -
            layer.sheetTransform.rotation
        )
    }
    if (current.kind === 'remainder-scale' && current.layerId) {
      const start = current.objectTransform
      const layer = useUIStore
        .getState()
        .sceneLayers.find((item) => item.id === current.layerId)
      if (start && layer) {
        const ratios = gestureScaleRatios(current, event)
        const targetScaleX = Math.max(
          0.1,
          Math.min(
            4,
            ratios
              ? start.scaleX * ratios.x
              : start.scaleX +
                  dx * (current.handlePosition?.includes('w') ? -0.01 : 0.01)
          )
        )
        const targetScaleY = Math.max(
          0.1,
          Math.min(
            4,
            ratios
              ? start.scaleY * ratios.y
              : start.scaleY +
                  dy * (current.handlePosition?.includes('n') ? -0.01 : 0.01)
          )
        )
        const fixed = fixedCornerPoint(start.bounds, current.handlePosition)
        const before = transformedOffset(fixed, start)
        const after = transformedOffset(
          fixed,
          start,
          targetScaleX,
          targetScaleY
        )
        const targetX = start.x + before.x - after.x
        const targetY = start.y + before.y - after.y
        moveRemainder(
          current.layerId,
          targetX - layer.sheetTransform.x,
          targetY - layer.sheetTransform.y
        )
        scaleRemainder(
          current.layerId,
          targetScaleX - layer.sheetTransform.scaleX,
          targetScaleY - layer.sheetTransform.scaleY
        )
      }
    }
    if (current.kind === 'piece-move' && current.id && current.layerId) {
      const start = current.objectTransform
      const piece = useUIStore
        .getState()
        .sceneLayers.flatMap((layer) => layer.pieces)
        .find((item) => item.id === current.id)
      if (start && piece) {
        const delta = localDelta(current.layerId)
        movePiece(
          current.id,
          start.x + delta.x - piece.x,
          start.y + delta.y - piece.y
        )
      }
    }
    if (current.kind === 'piece-rotate' && current.id) {
      const start = current.objectTransform
      const piece = useUIStore
        .getState()
        .sceneLayers.flatMap((layer) => layer.pieces)
        .find((item) => item.id === current.id)
      if (start && piece)
        rotatePiece(
          current.id,
          start.rotation +
            rotationGestureDelta(current, event, dx) -
            piece.rotation
        )
    }
    if (current.kind === 'piece-scale' && current.id) {
      const start = current.objectTransform
      const piece = useUIStore
        .getState()
        .sceneLayers.flatMap((layer) => layer.pieces)
        .find((item) => item.id === current.id)
      if (start && piece) {
        const ratios = gestureScaleRatios(current, event)
        const targetScaleX = Math.max(
          0.1,
          Math.min(
            4,
            ratios
              ? start.scaleX * ratios.x
              : start.scaleX +
                  dx * (current.handlePosition?.includes('w') ? -0.01 : 0.01)
          )
        )
        const targetScaleY = Math.max(
          0.1,
          Math.min(
            4,
            ratios
              ? start.scaleY * ratios.y
              : start.scaleY +
                  dy * (current.handlePosition?.includes('n') ? -0.01 : 0.01)
          )
        )
        const fixed = fixedCornerPoint(start.bounds, current.handlePosition)
        const before = transformedOffset(fixed, start)
        const after = transformedOffset(
          fixed,
          start,
          targetScaleX,
          targetScaleY
        )
        movePiece(
          current.id,
          start.x + before.x - after.x - piece.x,
          start.y + before.y - after.y - piece.y
        )
        scalePiece(
          current.id,
          targetScaleX - piece.scaleX,
          targetScaleY - piece.scaleY
        )
      }
    }
    if (current.layerId && current.transform) {
      if (current.kind === 'layer-move') {
        setLayerTransform(current.layerId, 'x', current.transform.x + dx / zoom)
        setLayerTransform(current.layerId, 'y', current.transform.y + dy / zoom)
      }
      if (current.kind === 'layer-rotate')
        setLayerTransform(
          current.layerId,
          'rotation',
          current.transform.rotation + rotationGestureDelta(current, event, dx)
        )
      if (current.kind === 'layer-scale') {
        const ratios = gestureScaleRatios(current, event)
        const targetWidth = Math.max(
          10,
          Math.min(
            150,
            ratios
              ? current.transform.width * ratios.x
              : current.transform.width +
                  dx * (current.handlePosition?.includes('w') ? -0.15 : 0.15)
          )
        )
        const targetHeight = Math.max(
          10,
          Math.min(
            150,
            ratios
              ? current.transform.height * ratios.y
              : current.transform.height +
                  dy * (current.handlePosition?.includes('n') ? -0.15 : 0.15)
          )
        )
        const stage =
          stageRef.current?.querySelector<HTMLElement>('.stage-orbit')
        const deltaWidth =
          ((stage?.clientWidth || stageSize.width) *
            (targetWidth - current.transform.width)) /
          100
        const deltaHeight =
          ((stage?.clientHeight || stageSize.height) *
            (targetHeight - current.transform.height)) /
          100
        const localX =
          (current.handlePosition?.includes('w') ? -1 : 1) * deltaWidth * 0.5
        const localY =
          (current.handlePosition?.includes('n') ? -1 : 1) * deltaHeight * 0.5
        const radians = (current.transform.rotation * Math.PI) / 180
        const centerX =
          current.transform.x +
          localX * Math.cos(radians) -
          localY * Math.sin(radians)
        const centerY =
          current.transform.y +
          localX * Math.sin(radians) +
          localY * Math.cos(radians)
        setLayerTransform(current.layerId, 'x', centerX)
        setLayerTransform(current.layerId, 'y', centerY)
        setLayerTransform(current.layerId, 'width', targetWidth)
        setLayerTransform(current.layerId, 'height', targetHeight)
      }
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
      {!live &&
        selectedSketchIds.includes(object.id) &&
        object.id === activeSketchId && (
          <SelectionBounds shapes={object.shapes} ownerId={object.id} />
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
          ? 'Sketch · draw primitives or double-click a contour to select it'
          : mode === 'stage'
            ? 'Stage · drag to orbit'
            : 'Double-click an object, then drag it or use its handles'}
      </div>
      <div
        ref={stageRef}
        className={'layer-stage ' + (grid ? 'with-grid' : '')}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={onDoubleClick}
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
            .sort(
              (a, b) =>
                a.depth - b.depth ||
                sceneLayers.indexOf(b) - sceneLayers.indexOf(a)
            )
            .map((layer) => {
              const transform = layer.transform
              const layerAspect = Math.max(
                0.01,
                (stageSize.width * transform.width) /
                  (stageSize.height * transform.height)
              )
              const contextLayer =
                mode === 'sketch' && layer.id !== activeSketchLayerId
              const selectedRemainderOnLayer =
                selectedRemainderLayerId === layer.id
              const logicalLayerSelected =
                selected === layer.id && !hasDirectObjectSelection
              const layerIsInteractive = layer.id === interactionLayerId
              return (
                <div
                  data-canvas-layer={layer.id}
                  data-layer-depth={layer.depth}
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
                      mode === 'sketch' && !layerIsInteractive
                        ? 'none'
                        : 'auto',
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
                  <PaperSurface layer={layer} aspect={layerAspect} />
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
                        pointerEvents: 'all'
                      }}
                      transform={screenSpaceMatrix({
                        x: layer.sheetTransform.x,
                        y: layer.sheetTransform.y,
                        rotation: layer.sheetTransform.rotation,
                        scaleX: layer.sheetTransform.scaleX,
                        scaleY: layer.sheetTransform.scaleY,
                        cx: 50,
                        cy: 50,
                        aspect: layerAspect
                      })}
                    >
                      <rect width="100" height="100" fill="transparent" />
                      {selectedRemainderLayerId === layer.id && (
                        <SelectionBounds
                          ownerId={'remainder-' + layer.id}
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
                      .sort((a, b) => {
                        const aActive = a.id === activePieceId
                        const bActive = b.id === activePieceId
                        return aActive === bActive
                          ? a.depthOffset - b.depthOffset
                          : aActive
                            ? 1
                            : -1
                      })
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
                              pointerEvents: 'all',
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
                            transform={screenSpaceMatrix({
                              x: piece.x,
                              y: piece.y,
                              rotation: piece.rotation,
                              scaleX: piece.scaleX,
                              scaleY: piece.scaleY,
                              cx: bounds.cx,
                              cy: bounds.cy,
                              aspect: layerAspect
                            })}
                          >
                            {piece.id === activePieceId && (
                              <rect
                                className="piece-drag-surface"
                                x={bounds.x}
                                y={bounds.y}
                                width={bounds.width}
                                height={bounds.height}
                                fill="transparent"
                              />
                            )}
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
                            {piece.id === activePieceId && (
                              <SelectionBounds
                                shapes={piece.shapes}
                                ownerId={piece.id}
                              />
                            )}
                          </g>
                        )
                      })}
                    {(mode === 'sketch' || mode === 'compose') &&
                      layer.id === interactionLayerId &&
                      layer.sketches
                        .filter((object) => object.visible)
                        .map((object) => renderSketch(object, false, true))}
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
                          ownerId={'layer-' + layer.id}
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
        {safeFrame && (
          <div
            className="safe-frame"
            style={{ pointerEvents: 'none' }}
            aria-hidden="true"
          />
        )}
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
