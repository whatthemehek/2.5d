export type LayerTransform = { x: number; y: number; rotation: number; scaleX: number; scaleY: number; opacity: number }
export type Layer = { id: string; name: string; depth: number; color: string; visible: boolean; transform: LayerTransform; components?: { id: string; name: string }[] }
export const layers: Layer[] = [
  { id: 'foreground', name: 'Foreground', depth: 900, color: '#6b8145', visible: true, transform: { x: 0, y: 0, rotation: 0, scaleX: 100, scaleY: 100, opacity: 100 } },
  { id: 'character', name: 'Character', depth: 420, color: '#db735a', visible: true, transform: { x: 0, y: 0, rotation: 0, scaleX: 100, scaleY: 100, opacity: 100 }, components: [{ id: 'head', name: 'Head' }, { id: 'body', name: 'Body' }, { id: 'left-arm', name: 'Left Arm' }, { id: 'right-arm', name: 'Right Arm' }] },
  { id: 'background', name: 'Background', depth: 0, color: '#8bb7c6', visible: true, transform: { x: 0, y: 0, rotation: 0, scaleX: 100, scaleY: 100, opacity: 100 } }
]
export const assets = [{ name: 'White paper', color: '#eee6d4' }, { name: 'Kraft paper', color: '#bd925f' }, { name: 'Watercolor', color: '#b8c3af' }, { name: 'Cardboard', color: '#9b704b' }, { name: 'Plywood', color: '#c59a68' }, { name: 'Red construction', color: '#bd4e42' }]
export const tracks = ['Camera', 'Foreground', 'Character', 'Left Arm', 'Right Arm', 'Background']
