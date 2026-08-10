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
  it('selects a tool and object', () => {
    render(<App />)
    fireEvent.click(screen.getByText('tools'))
    fireEvent.click(screen.getByText('Rotate'))
    expect(useUIStore.getState().tool).toBe('Rotate')
    fireEvent.click(screen.getByText('layers'))
    fireEvent.click(screen.getAllByText('Sheet remainder')[0])
    expect(useUIStore.getState().selectedRemainderLayerId).toBe('foreground')
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
  it('zooms with the pointer wheel', () => {
    render(<App />)
    fireEvent.wheel(document.querySelector('.layer-stage')!, { deltaY: -100 })
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
  it('moves, rotates, scales, and changes depth for a logical layer', () => {
    render(<App />)
    const stage = document.querySelector('.layer-stage') as HTMLElement
    const sheet = document.querySelector('[data-remainder-id="foreground"]')!
    const drag = (
      tool: string,
      from: [number, number],
      to: [number, number],
      pointerId: number
    ) => {
      fireEvent.click(screen.getByLabelText(tool + ' tool'))
      fireEvent.pointerDown(sheet, {
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
    drag('Move', [100, 100], [140, 125], 21)
    drag('Rotate', [100, 100], [140, 100], 22)
    drag('Scale', [100, 100], [140, 120], 23)
    drag('Depth', [100, 100], [120, 100], 24)
    const layer = useUIStore.getState().sceneLayers[0]
    expect(layer.transform).toMatchObject({
      x: 40,
      y: 25,
      rotation: 18,
      width: 31,
      height: 28
    })
    expect(layer.depth).toBe(940)
  })

  it('moves, rotates, scales, and changes depth for a sheet remainder', () => {
    render(<App />)
    fireEvent.click(screen.getAllByText('Sheet remainder')[0])
    const stage = document.querySelector('.layer-stage') as HTMLElement
    const layerElement = document.querySelector(
      '[data-canvas-layer="foreground"]'
    ) as HTMLElement
    Object.defineProperty(layerElement, 'clientWidth', { value: 400 })
    Object.defineProperty(layerElement, 'clientHeight', { value: 400 })
    const sheet = document.querySelector('[data-remainder-id="foreground"]')!
    const drag = (tool: string, dx: number, dy: number, pointerId: number) => {
      fireEvent.click(screen.getByLabelText(tool + ' tool'))
      fireEvent.pointerDown(sheet, { clientX: 100, clientY: 100, pointerId })
      fireEvent.pointerMove(stage, {
        clientX: 100 + dx,
        clientY: 100 + dy,
        pointerId
      })
      fireEvent.pointerUp(stage, { pointerId })
    }
    drag('Move', 40, 20, 31)
    drag('Rotate', 20, 0, 32)
    drag('Scale', 20, 10, 33)
    drag('Depth', 10, 0, 34)
    expect(useUIStore.getState().sceneLayers[0].sheetTransform).toMatchObject({
      x: 10,
      y: 5,
      rotation: 9,
      scaleX: 1.2,
      scaleY: 1.1,
      depthOffset: 20
    })
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
    render(<App />)
    const stage = document.querySelector('.layer-stage') as HTMLElement
    const layerElement = document.querySelector(
      '[data-canvas-layer="foreground"]'
    ) as HTMLElement
    Object.defineProperty(layerElement, 'clientWidth', { value: 400 })
    Object.defineProperty(layerElement, 'clientHeight', { value: 400 })
    const piece = document.querySelector('[data-piece-id]')!
    const drag = (tool: string, dx: number, dy: number, pointerId: number) => {
      fireEvent.click(screen.getByLabelText(tool + ' tool'))
      fireEvent.pointerDown(piece, { clientX: 100, clientY: 100, pointerId })
      fireEvent.pointerMove(stage, {
        clientX: 100 + dx,
        clientY: 100 + dy,
        pointerId
      })
      fireEvent.pointerUp(stage, { pointerId })
    }
    drag('Move', 40, 20, 27)
    drag('Rotate', 20, 0, 28)
    drag('Scale', 20, 10, 29)
    drag('Depth', 10, 0, 30)
    expect(useUIStore.getState().sceneLayers[0].pieces[0]).toMatchObject({
      x: 10,
      y: 5,
      rotation: 9,
      scaleX: 1.2,
      scaleY: 1.1,
      depthOffset: 32
    })
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
      selectedSketchIds: ['editable'],
      tool: 'Select'
    })
    render(<App />)
    const layer = document.querySelector(
      '[data-canvas-layer="foreground"]'
    ) as HTMLElement
    const stage = document.querySelector('.layer-stage') as HTMLElement
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
    fireEvent.pointerDown(
      document.querySelector('[data-sketch-id="editable"]')!,
      { clientX: 100, clientY: 100, pointerId: 2 }
    )
    fireEvent.pointerMove(stage, { clientX: 140, clientY: 120, pointerId: 2 })
    fireEvent.pointerUp(stage, { pointerId: 2 })
    let points =
      useUIStore.getState().sceneLayers[0].sketches[0].shapes[0].points
    expect(points[0]).toMatchObject({ x: 30, y: 25 })
    const scaleHandle = document.querySelector(
      '[data-sketch-id="editable"] [data-handle="scale"]'
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
    const beforeRotate = { ...points[0] }
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
    points = useUIStore.getState().sceneLayers[0].sketches[0].shapes[0].points
    expect(points[0]).not.toEqual(beforeRotate)
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
