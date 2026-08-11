import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { App } from '../app/App'
import { useUIStore } from '../state/uiStore'
import { layers } from '../mock/project'
afterEach(cleanup)
beforeEach(() =>
  useUIStore.setState({
    mode: 'compose',
    tab: 'layers',
    tool: 'Select',
    selected: 'foreground',
    selectedRemainderLayerId: null,
    activeSketchLayerId: 'foreground',
    selectedPieces: [],
    selectedSketchIds: [],
    dialog: null,
    time: 4.2,
    playing: false,
    grid: true,
    safeFrame: true,
    material: 'White paper',
    expanded: {
      character: true,
      transform: true,
      layer: true,
      motion: false,
      edge: false,
      material: false,
      shadow: false
    },
    keyframes: [],
    sceneLayers: layers,
    orbit: { x: -18, y: 18 },
    zoom: 1,
    saveStatus: 'saved',
    reorderMode: 'cascade'
  })
)
describe('Papercut wireframe', () => {
  it('saves the editable layer document with Ctrl+S', () => {
    render(<App />)
    fireEvent.change(screen.getByLabelText('Depth for Foreground'), {
      target: { value: '650' }
    })
    fireEvent.keyDown(window, { key: 's', ctrlKey: true })
    const saved = JSON.parse(
      window.localStorage.getItem('papercut.prototype.project.v1')!
    )
    expect(saved.version).toBe(3)
    expect(saved.sceneLayers[0].depth).toBe(650)
    expect(useUIStore.getState().saveStatus).toBe('saved')
  })
  it('switches workspace modes', () => {
    render(<App />)
    fireEvent.click(screen.getByText('Stage'))
    expect(useUIStore.getState().mode).toBe('stage')
  })
  it('selects a sheet remainder from the layer hierarchy', () => {
    render(<App />)
    expect(
      Array.from(document.querySelectorAll('[data-selection-owner]')).map(
        (element) => element.getAttribute('data-selection-owner')
      )
    ).toEqual(['layer-foreground'])
    fireEvent.click(screen.getAllByText('Sheet remainder')[0])
    expect(useUIStore.getState().selectedRemainderLayerId).toBe('foreground')
    expect(
      Array.from(document.querySelectorAll('[data-selection-owner]')).map(
        (element) => element.getAttribute('data-selection-owner')
      )
    ).toEqual(['remainder-foreground'])
  })
  it('returns to Compose when selecting a sheet remainder from Sketch', () => {
    render(<App />)
    fireEvent.click(screen.getByText('Sketch'))
    fireEvent.click(screen.getByLabelText('Circle tool'))
    expect(useUIStore.getState().mode).toBe('sketch')
    fireEvent.click(screen.getAllByText('Sheet remainder')[0])
    expect(useUIStore.getState()).toMatchObject({
      mode: 'compose',
      tool: 'Select',
      selectedRemainderLayerId: 'foreground'
    })
    expect(screen.queryByLabelText('Rotate tool')).not.toBeInTheDocument()
  })

  it('opens and closes dialogs', () => {
    render(<App />)
    fireEvent.click(screen.getByText('Preview'))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('Close dialog'))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
  it('updates playhead time', () => {
    render(<App />)
    const ruler = document.querySelector('.ruler-area')!
    Object.defineProperty(ruler, 'getBoundingClientRect', {
      value: () => ({ left: 0, width: 120 })
    })
    fireEvent.click(ruler, { clientX: 60 })
    expect(useUIStore.getState().time).toBe(6)
  })
  it('does not open delete confirmation while editing transform values', () => {
    render(<App />)
    const input = screen.getByLabelText('X')
    input.focus()
    fireEvent.keyDown(input, { key: 'Backspace' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
  it('allows a transform number to be cleared and replaced', () => {
    render(<App />)
    const width = screen.getByLabelText('Width')
    fireEvent.change(width, { target: { value: '10' } })
    fireEvent.change(width, { target: { value: '' } })
    expect(width).toHaveValue('')
    fireEvent.change(width, { target: { value: '20' } })
    expect(useUIStore.getState().sceneLayers[0].transform.width).toBe(20)
  })
  it('updates the selected layer transform from the inspector', () => {
    render(<App />)
    fireEvent.change(screen.getByLabelText('X'), { target: { value: '' } })
    fireEvent.change(screen.getByLabelText('X'), { target: { value: '120' } })
    fireEvent.change(screen.getByLabelText('Rotation'), {
      target: { value: '32' }
    })
    fireEvent.change(screen.getByLabelText('Width'), {
      target: { value: '135' }
    })
    fireEvent.change(screen.getByLabelText('Height'), {
      target: { value: '80' }
    })
    fireEvent.change(screen.getByLabelText('Opacity'), {
      target: { value: '74' }
    })
    fireEvent.change(screen.getByLabelText('Depth'), {
      target: { value: '640' }
    })
    const layer = useUIStore
      .getState()
      .sceneLayers.find((item) => item.id === 'foreground')!
    expect(layer.transform).toMatchObject({
      x: 120,
      rotation: 32,
      width: 135,
      height: 80,
      opacity: 74
    })
    expect(layer.depth).toBe(640)
  })
  it('resolves cascade and split reorder depths from the back', () => {
    useUIStore.getState().reorderLayer('foreground', 'background')
    expect(
      useUIStore.getState().sceneLayers.map((layer) => [layer.id, layer.depth])
    ).toEqual([
      ['character', 900],
      ['background', 420],
      ['foreground', 0]
    ])
    useUIStore.setState({
      sceneLayers: layers.map((layer) => ({ ...layer })),
      reorderMode: 'split'
    })
    useUIStore.getState().reorderLayer('foreground', 'background')
    expect(
      useUIStore.getState().sceneLayers.map((layer) => [layer.id, layer.depth])
    ).toEqual([
      ['character', 520],
      ['background', 100],
      ['foreground', 0]
    ])
  })
  it('reorders layers by drag and drop', () => {
    render(<App />)
    fireEvent.dragStart(screen.getByLabelText('Drag Foreground'))
    fireEvent.dragOver(document.querySelector('[data-layer-id="background"]')!)
    fireEvent.drop(document.querySelector('[data-layer-id="background"]')!)
    expect(useUIStore.getState().sceneLayers.map((layer) => layer.id)).toEqual([
      'character',
      'background',
      'foreground'
    ])
  })
  it('updates layer visibility, name, and color', () => {
    render(<App />)
    fireEvent.click(screen.getByLabelText('Hide Foreground'))
    fireEvent.change(screen.getByLabelText('Rename Foreground'), {
      target: { value: 'Near paper' }
    })
    fireEvent.change(screen.getByLabelText('Color for Near paper'), {
      target: { value: '#123456' }
    })
    const layer = useUIStore.getState().sceneLayers[0]
    expect(layer.visible).toBe(false)
    expect(layer.name).toBe('Near paper')
    expect(layer.color).toBe('#123456')
  })
  it('edits depth and allows a layer to be removed then added', () => {
    render(<App />)
    fireEvent.change(screen.getByLabelText('Depth for Foreground'), {
      target: { value: '640' }
    })
    expect(useUIStore.getState().sceneLayers[0].depth).toBe(640)
    fireEvent.click(screen.getByLabelText('Remove Foreground'))
    expect(useUIStore.getState().sceneLayers).toHaveLength(2)
    fireEvent.click(screen.getByText('Add Layer'))
    expect(useUIStore.getState().sceneLayers).toHaveLength(3)
  })
  it('zooms only the viewer and cancels pinch-style browser zoom', () => {
    render(<App />)
    const viewer = document.querySelector('.layer-viewport')!
    const wheel = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      ctrlKey: true,
      deltaY: -100
    })
    fireEvent(viewer, wheel)
    expect(wheel.defaultPrevented).toBe(true)
    expect(useUIStore.getState().zoom).toBe(1.08)
  })
  it('zooms the stage controls', () => {
    render(<App />)
    fireEvent.click(screen.getByLabelText('Zoom in'))
    expect(useUIStore.getState().zoom).toBe(1.1)
    fireEvent.click(screen.getByText('Fit'))
    expect(useUIStore.getState().zoom).toBe(1)
  })
  it('keeps the three layer limit disabled', () => {
    render(<App />)
    expect(screen.getByText('Add Layer').closest('button')).toBeDisabled()
  })
})

describe('Compose object tools', () => {
  it('moves, rotates, and scales a logical layer with direct handles', () => {
    render(<App />)
    const stage = document.querySelector('.layer-stage') as HTMLElement
    const sheet = document.querySelector('[data-remainder-id="foreground"]')!
    const drag = (
      target: Element,
      from: [number, number],
      to: [number, number],
      pointerId: number
    ) => {
      fireEvent.pointerDown(target, {
        clientX: from[0],
        clientY: from[1],
        pointerId
      })
      fireEvent.pointerMove(stage, {
        clientX: to[0],
        clientY: to[1],
        pointerId
      })
      fireEvent.pointerUp(stage, { pointerId })
    }
    drag(sheet, [100, 100], [140, 125], 21)
    drag(
      document.querySelector(
        '[data-layer-control-id="foreground"] [data-handle="rotate"]'
      )!,
      [100, 100],
      [140, 100],
      22
    )
    drag(
      document.querySelector(
        '[data-layer-control-id="foreground"] [data-handle-position="se"]'
      )!,
      [100, 100],
      [140, 120],
      23
    )
    const layer = useUIStore.getState().sceneLayers[0]
    expect(layer.transform).toMatchObject({
      rotation: 18,
      width: 31,
      height: 28
    })
    expect(layer.transform.x).toBeGreaterThan(40)
    expect(layer.transform.y).toBeGreaterThan(25)
  })

  it('moves, rotates, and scales a sheet remainder with direct handles', () => {
    render(<App />)
    fireEvent.click(screen.getAllByText('Sheet remainder')[0])
    const stage = document.querySelector('.layer-stage') as HTMLElement
    const layerElement = document.querySelector(
      '[data-canvas-layer="foreground"]'
    ) as HTMLElement
    Object.defineProperty(layerElement, 'clientWidth', { value: 400 })
    Object.defineProperty(layerElement, 'clientHeight', { value: 400 })
    const sheet = document.querySelector('[data-remainder-id="foreground"]')!
    const drag = (
      target: Element,
      dx: number,
      dy: number,
      pointerId: number
    ) => {
      fireEvent.pointerDown(target, {
        clientX: 100,
        clientY: 100,
        pointerId
      })
      fireEvent.pointerMove(stage, {
        clientX: 100 + dx,
        clientY: 100 + dy,
        pointerId
      })
      fireEvent.pointerUp(stage, { pointerId })
    }
    drag(sheet, 40, 20, 31)
    drag(sheet.querySelector('[data-handle="rotate"]')!, 20, 0, 32)
    drag(sheet.querySelector('[data-handle-position="se"]')!, 20, 10, 33)
    expect(useUIStore.getState().sceneLayers[0].sheetTransform).toMatchObject({
      rotation: 9,
      scaleX: 1.2,
      scaleY: 1.1,
      depthOffset: 0
    })
    expect(
      useUIStore.getState().sceneLayers[0].sheetTransform.x
    ).toBeGreaterThan(10)
    expect(
      useUIStore.getState().sceneLayers[0].sheetTransform.y
    ).toBeGreaterThan(5)
  })

  it('keeps the dragged corner under the cursor and rotates around the center', () => {
    useUIStore.getState().selectRemainder('foreground')
    render(<App />)
    const stage = document.querySelector('.layer-stage') as HTMLElement
    const layer = document.querySelector(
      '[data-canvas-layer="foreground"]'
    ) as HTMLElement
    const sheet = layer.querySelector(
      '[data-remainder-id="foreground"]'
    ) as SVGElement
    Object.defineProperty(layer, 'clientWidth', { value: 400 })
    Object.defineProperty(layer, 'clientHeight', { value: 400 })
    Object.defineProperty(layer, 'getBoundingClientRect', {
      value: () => ({
        left: 0,
        top: 0,
        width: 400,
        height: 400,
        right: 400,
        bottom: 400
      })
    })
    const centers: Record<string, [number, number]> = {
      nw: [100, 100],
      ne: [200, 100],
      sw: [100, 200],
      se: [200, 200]
    }
    for (const [position, [x, y]] of Object.entries(centers)) {
      const handle = sheet.querySelector(
        '[data-handle-position="' + position + '"]'
      )!
      Object.defineProperty(handle, 'getBoundingClientRect', {
        value: () => ({
          left: x - 4,
          top: y - 4,
          width: 8,
          height: 8,
          right: x + 4,
          bottom: y + 4
        })
      })
    }

    const scaleHandle = sheet.querySelector('[data-handle-position="se"]')!
    fireEvent.pointerDown(scaleHandle, {
      clientX: 200,
      clientY: 200,
      pointerId: 61
    })
    fireEvent.pointerMove(stage, {
      clientX: 250,
      clientY: 230,
      pointerId: 61
    })
    fireEvent.pointerUp(stage, { pointerId: 61 })
    let transform = useUIStore.getState().sceneLayers[0].sheetTransform
    expect(transform).toMatchObject({
      x: 25,
      y: 15,
      scaleX: 1.5,
      scaleY: 1.3
    })
    expect(transform.x + 50 - 50 * transform.scaleX).toBeCloseTo(0, 8)
    expect(transform.y + 50 - 50 * transform.scaleY).toBeCloseTo(0, 8)

    const rotateHandle = sheet.querySelector('[data-handle="rotate"]')!
    fireEvent.pointerDown(rotateHandle, {
      clientX: 150,
      clientY: 60,
      pointerId: 62
    })
    fireEvent.pointerMove(stage, {
      clientX: 230,
      clientY: 150,
      pointerId: 62
    })
    fireEvent.pointerUp(stage, { pointerId: 62 })
    transform = useUIStore.getState().sceneLayers[0].sheetTransform
    expect(transform.rotation).toBeCloseTo(90, 8)

    fireEvent.pointerDown(sheet, {
      clientX: 100,
      clientY: 100,
      pointerId: 63
    })
    fireEvent.pointerMove(stage, {
      clientX: 140,
      clientY: 120,
      pointerId: 63
    })
    fireEvent.pointerUp(stage, { pointerId: 63 })
    transform = useUIStore.getState().sceneLayers[0].sheetTransform
    expect(transform).toMatchObject({ x: 35, y: 20 })
  })

  it('orders canvas hit regions from back to front by depth', () => {
    useUIStore.getState().selectRemainder('background')
    render(<App />)
    const canvasLayers = Array.from(
      document.querySelectorAll<HTMLElement>('[data-canvas-layer]')
    )
    expect(canvasLayers.map((layer) => layer.dataset.canvasLayer)).toEqual([
      'background',
      'character',
      'foreground'
    ])
    expect(canvasLayers.map((layer) => layer.style.pointerEvents)).toEqual([
      'auto',
      'auto',
      'auto'
    ])
    expect(document.querySelector('.safe-frame')).toHaveStyle({
      pointerEvents: 'none'
    })
    fireEvent.doubleClick(
      document.querySelector('[data-remainder-id="foreground"]')!
    )
    expect(useUIStore.getState().selectedRemainderLayerId).toBe('foreground')
  })

  it('locks interaction to a selected middle-layer remainder', () => {
    render(<App />)
    fireEvent.click(screen.getAllByText('Sheet remainder')[1])
    const stage = document.querySelector('.layer-stage') as HTMLElement
    const character = document.querySelector(
      '[data-canvas-layer="character"]'
    ) as HTMLElement
    const background = document.querySelector(
      '[data-canvas-layer="background"]'
    ) as HTMLElement
    const characterSheet = character.querySelector(
      '[data-remainder-id="character"]'
    )!
    const backgroundSheet = background.querySelector(
      '[data-remainder-id="background"]'
    )!
    Object.defineProperty(character, 'clientWidth', { value: 400 })
    Object.defineProperty(character, 'clientHeight', { value: 400 })

    expect(character.style.pointerEvents).toBe('auto')
    expect(background.style.pointerEvents).toBe('auto')
    expect(characterSheet.querySelector('[data-handle="move"]')).toBeNull()
    expect(
      characterSheet.querySelector('[data-handle="rotate"]')
    ).toBeInTheDocument()
    const selectionTop = Number(
      characterSheet
        .querySelector('.vector-selection > rect:first-child')!
        .getAttribute('y')
    )
    const rotationY = Number(
      characterSheet.querySelector('[data-handle="rotate"]')!.getAttribute('cy')
    )
    expect(rotationY).toBeLessThan(selectionTop)

    fireEvent.pointerDown(backgroundSheet, {
      clientX: 100,
      clientY: 100,
      pointerId: 41
    })
    fireEvent.pointerMove(stage, {
      clientX: 140,
      clientY: 120,
      pointerId: 41
    })
    fireEvent.pointerUp(stage, { pointerId: 41 })
    expect(useUIStore.getState().selectedRemainderLayerId).toBe('character')
    expect(useUIStore.getState().sceneLayers[2].sheetTransform.x).toBe(0)
    expect(useUIStore.getState().sceneLayers[1].sheetTransform.x).toBe(0)

    fireEvent.pointerDown(characterSheet, {
      clientX: 100,
      clientY: 100,
      pointerId: 42
    })
    fireEvent.pointerMove(stage, {
      clientX: 140,
      clientY: 120,
      pointerId: 42
    })
    fireEvent.pointerUp(stage, { pointerId: 42 })
    expect(useUIStore.getState().sceneLayers[1].sheetTransform).toMatchObject({
      x: 10,
      y: 5
    })
  })

  it('shows shape tools only while editing a sketch', () => {
    render(<App />)
    for (const tool of ['Select', 'Move', 'Rotate', 'Scale'])
      expect(screen.queryByLabelText(tool + ' tool')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Depth tool')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Rectangle tool')).not.toBeInTheDocument()
    expect(screen.queryByText('Cut selected')).not.toBeInTheDocument()

    fireEvent.click(screen.getByText('Sketch'))
    expect(screen.getByLabelText('Rectangle tool')).toBeInTheDocument()
    expect(screen.getByLabelText('Circle tool')).toBeInTheDocument()
    expect(screen.getByText('Cut selected')).toBeInTheDocument()
    for (const tool of ['Select', 'Move', 'Rotate', 'Scale'])
      expect(screen.queryByLabelText(tool + ' tool')).not.toBeInTheDocument()
  })

  it('transforms and individually deletes a cutout', () => {
    useUIStore.getState().addSketchObject('foreground', {
      id: 'cut-source',
      name: 'Round',
      visible: true,
      closed: true,
      shapes: [
        {
          id: 'round-shape',
          type: 'circle',
          closed: true,
          points: [
            { x: 20, y: 20 },
            { x: 60, y: 60 }
          ]
        }
      ]
    })
    useUIStore.setState({
      selectedSketchIds: ['cut-source'],
      activeSketchLayerId: 'foreground'
    })
    useUIStore.getState().cutSelectedContours()
    const cutoutId = useUIStore.getState().sceneLayers[0].pieces[0].id
    useUIStore.getState().selectRemainder('foreground')
    render(<App />)
    const stage = document.querySelector('.layer-stage') as HTMLElement
    const layerElement = document.querySelector(
      '[data-canvas-layer="foreground"]'
    ) as HTMLElement
    Object.defineProperty(layerElement, 'clientWidth', { value: 400 })
    Object.defineProperty(layerElement, 'clientHeight', { value: 400 })
    const piece = document.querySelector('[data-piece-id]')!
    expect((piece as SVGElement).style.pointerEvents).toBe('all')
    fireEvent.pointerDown(piece, {
      clientX: 100,
      clientY: 100,
      pointerId: 26
    })
    fireEvent.pointerUp(stage, { pointerId: 26 })
    expect(useUIStore.getState().selectedPieces).toEqual([])
    fireEvent.doubleClick(piece)
    expect(useUIStore.getState().selectedPieces).toEqual([cutoutId])
    expect(document.querySelectorAll('[data-selection-owner]')).toHaveLength(1)
    expect(
      document
        .querySelector('[data-selection-owner]')
        ?.getAttribute('data-selection-owner')
    ).toBe(cutoutId)
    const dragSurface = piece.querySelector('.piece-drag-surface')!
    expect(dragSurface).toBeInTheDocument()

    const drag = (
      target: Element,
      dx: number,
      dy: number,
      pointerId: number
    ) => {
      fireEvent.pointerDown(target, {
        clientX: 100,
        clientY: 100,
        pointerId
      })
      fireEvent.pointerMove(stage, {
        clientX: 100 + dx,
        clientY: 100 + dy,
        pointerId
      })
      fireEvent.pointerUp(stage, { pointerId })
    }
    drag(dragSurface, 40, 20, 27)
    drag(piece.querySelector('[data-handle="rotate"]')!, 20, 0, 28)
    const matrix = piece.getAttribute('transform')!
    expect(matrix).toMatch(/^matrix\(/)
    const [a, b, c, d] = matrix.slice(7, -1).split(' ').slice(0, 4).map(Number)
    const aspect = 800 / 550
    expect(Math.abs(aspect * aspect * a * c + b * d)).toBeLessThan(0.000001)
    drag(piece.querySelector('[data-handle-position="se"]')!, 20, 10, 29)
    expect(useUIStore.getState().sceneLayers[0].pieces[0]).toMatchObject({
      rotation: 9,
      scaleX: 1.2,
      scaleY: 1.1,
      depthOffset: 12
    })
    expect(useUIStore.getState().sceneLayers[0].pieces[0].x).toBeGreaterThan(10)
    expect(useUIStore.getState().sceneLayers[0].pieces[0].y).toBeGreaterThan(5)
    fireEvent.click(screen.getByLabelText('Delete Round cutout'))
    expect(useUIStore.getState().sceneLayers[0].pieces).toHaveLength(0)
  })
})

describe('Layer sketch workspace', () => {
  it('enters Sketch mode with frozen dimmed context layers', () => {
    render(<App />)
    fireEvent.click(screen.getByText('Sketch'))
    expect(useUIStore.getState().mode).toBe('sketch')
    expect(document.querySelectorAll('.context-layer')).toHaveLength(2)
    expect(
      document.querySelector('[data-canvas-layer="foreground"]')
    ).not.toHaveClass('context-layer')
  })

  it('draws a live circle into the active layer sketch', () => {
    render(<App />)
    fireEvent.click(screen.getByText('Sketch'))
    fireEvent.click(screen.getByLabelText('Circle tool'))
    const layer = document.querySelector(
      '[data-canvas-layer="foreground"]'
    ) as HTMLElement
    const stage = document.querySelector('.layer-stage') as HTMLElement
    Object.defineProperty(layer, 'getBoundingClientRect', {
      value: () => ({
        left: 0,
        top: 0,
        width: 400,
        height: 400,
        right: 400,
        bottom: 400
      })
    })
    fireEvent.pointerDown(layer, { clientX: 80, clientY: 100, pointerId: 1 })
    fireEvent.pointerMove(stage, { clientX: 220, clientY: 260, pointerId: 1 })
    expect(document.querySelector('.sketch-object.live')).toBeInTheDocument()
    fireEvent.pointerUp(stage, { clientX: 220, clientY: 260, pointerId: 1 })
    const sketch = useUIStore
      .getState()
      .sceneLayers.find((item) => item.id === 'foreground')!.sketches[0]
    expect(sketch.shapes[0].type).toBe('circle')
    expect(sketch.closed).toBe(true)
  })

  it('moves, resizes, and rotates a selected sketch with direct handles', () => {
    useUIStore.getState().addSketchObject('foreground', {
      id: 'editable',
      name: 'Editable rectangle',
      visible: true,
      closed: true,
      shapes: [
        {
          id: 'editable-shape',
          type: 'rect',
          closed: true,
          points: [
            { x: 20, y: 20 },
            { x: 50, y: 50 }
          ]
        }
      ]
    })
    useUIStore.setState({
      mode: 'sketch',
      activeSketchLayerId: 'foreground',
      selectedSketchIds: [],
      tool: 'Circle'
    })
    render(<App />)
    const layer = document.querySelector(
      '[data-canvas-layer="foreground"]'
    ) as HTMLElement
    const stage = document.querySelector('.layer-stage') as HTMLElement
    Object.defineProperty(layer, 'clientWidth', { value: 400 })
    Object.defineProperty(layer, 'clientHeight', { value: 200 })
    Object.defineProperty(layer, 'getBoundingClientRect', {
      value: () => ({
        left: 0,
        top: 0,
        width: 400,
        height: 200,
        right: 400,
        bottom: 200
      })
    })
    const sketch = document.querySelector('[data-sketch-id="editable"]')!
    fireEvent.pointerDown(sketch, {
      clientX: 100,
      clientY: 100,
      pointerId: 1
    })
    fireEvent.pointerUp(stage, { pointerId: 1 })
    expect(useUIStore.getState().selectedSketchIds).toEqual([])
    fireEvent.doubleClick(sketch)
    expect(useUIStore.getState()).toMatchObject({
      selectedSketchIds: ['editable'],
      tool: 'Select'
    })

    fireEvent.pointerDown(sketch, {
      clientX: 100,
      clientY: 100,
      pointerId: 2
    })
    fireEvent.pointerMove(stage, { clientX: 140, clientY: 120, pointerId: 2 })
    fireEvent.pointerUp(stage, { pointerId: 2 })
    let points =
      useUIStore.getState().sceneLayers[0].sketches[0].shapes[0].points
    expect(points[0]).toMatchObject({ x: 30, y: 30 })
    const scaleHandle = document.querySelector(
      '[data-sketch-id="editable"] [data-handle-position="se"]'
    )!
    fireEvent.pointerDown(scaleHandle, {
      clientX: 140,
      clientY: 120,
      pointerId: 3
    })
    fireEvent.pointerMove(stage, { clientX: 180, clientY: 160, pointerId: 3 })
    fireEvent.pointerUp(stage, { pointerId: 3 })
    points = useUIStore.getState().sceneLayers[0].sketches[0].shapes[0].points
    expect(points[1].x - points[0].x).toBeGreaterThan(30)
    const screenLengthBefore = Math.hypot(
      (points[1].x - points[0].x) * 2,
      points[1].y - points[0].y
    )
    const rotateHandle = document.querySelector(
      '[data-sketch-id="editable"] [data-handle="rotate"]'
    )!
    fireEvent.pointerDown(rotateHandle, {
      clientX: 180,
      clientY: 100,
      pointerId: 4
    })
    fireEvent.pointerMove(stage, { clientX: 220, clientY: 100, pointerId: 4 })
    fireEvent.pointerUp(stage, { pointerId: 4 })
    const rotatedShape =
      useUIStore.getState().sceneLayers[0].sketches[0].shapes[0]
    expect(rotatedShape.type).toBe('pen')
    expect(rotatedShape.points).toHaveLength(4)
    points = rotatedShape.points
    const screenLengthAfter = Math.hypot(
      (points[2].x - points[0].x) * 2,
      points[2].y - points[0].y
    )
    expect(screenLengthAfter).toBeCloseTo(screenLengthBefore, 6)
  })

  it('merges line primitives into a selected closed contour', () => {
    const store = useUIStore.getState()
    store.addSketchObject('foreground', {
      id: 's1',
      name: 'Line 1',
      visible: true,
      closed: false,
      shapes: [
        {
          id: 'a',
          type: 'line',
          closed: false,
          points: [
            { x: 10, y: 10 },
            { x: 50, y: 10 }
          ]
        }
      ]
    })
    store.addSketchObject('foreground', {
      id: 's2',
      name: 'Line 2',
      visible: true,
      closed: false,
      shapes: [
        {
          id: 'b',
          type: 'line',
          closed: false,
          points: [
            { x: 50, y: 10 },
            { x: 30, y: 50 }
          ]
        }
      ]
    })
    useUIStore.setState({
      selectedSketchIds: ['s1', 's2'],
      activeSketchLayerId: 'foreground'
    })
    useUIStore.getState().mergeSelectedSketches()
    const layer = useUIStore
      .getState()
      .sceneLayers.find((item) => item.id === 'foreground')!
    expect(layer.sketches).toHaveLength(1)
    expect(layer.sketches[0].closed).toBe(true)
    expect(layer.sketches[0].shapes[0].type).toBe('pen')
  })

  it('cuts a selected closed contour and preserves remainder plus movable cutout', () => {
    useUIStore.getState().addSketchObject('foreground', {
      id: 'circle-sketch',
      name: 'Circle',
      visible: true,
      closed: true,
      shapes: [
        {
          id: 'circle-shape',
          type: 'circle',
          closed: true,
          points: [
            { x: 20, y: 20 },
            { x: 60, y: 60 }
          ]
        }
      ]
    })
    useUIStore.setState({
      selectedSketchIds: ['circle-sketch'],
      activeSketchLayerId: 'foreground',
      mode: 'sketch'
    })
    useUIStore.getState().cutSelectedContours()
    const layer = useUIStore
      .getState()
      .sceneLayers.find((item) => item.id === 'foreground')!
    expect(layer.cuts).toHaveLength(1)
    expect(layer.pieces).toHaveLength(1)
    expect(layer.pieces[0].depthOffset).toBe(12)
    expect(layer.sketches[0].visible).toBe(false)
    expect(useUIStore.getState().mode).toBe('compose')
    useUIStore.getState().movePiece(layer.pieces[0].id, 12, -4)
    expect(useUIStore.getState().sceneLayers[0].pieces[0]).toMatchObject({
      x: 12,
      y: -4
    })
  })
})
