import { expect } from 'vitest'
import * as matchers from '@testing-library/jest-dom/matchers'
expect.extend(matchers)

Object.defineProperty(window, 'PointerEvent', {
  writable: true,
  value: MouseEvent
})
