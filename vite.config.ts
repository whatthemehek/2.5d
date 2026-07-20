import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({ plugins: [react()], server: { host: '0.0.0.0', port: 5007 }, test: { environment: 'jsdom', setupFiles: './src/tests/setup.ts' } })
