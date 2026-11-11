import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { transformAsync } from '@babel/core'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const root = path.dirname(fileURLToPath(import.meta.url))

// JSX is authored in .js files so the oral report can point at App.js.
const jsxInJs = {
  name: 'jsx-in-js',
  enforce: 'pre',
  async transform(code, id) {
    if (!/\/src\/.*\.js$/.test(id) || !/<[A-Za-z]/.test(code)) return null
    const result = await transformAsync(code, {
      filename: id,
      babelrc: false,
      configFile: false,
      sourceMaps: true,
      presets: [['@babel/preset-react', { runtime: 'automatic' }]],
    })
    return { code: result.code, map: result.map }
  },
}

export default defineConfig({
  plugins: [jsxInJs, react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(root, 'src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 4870,
    strictPort: true,
    proxy: {
      '/api': 'http://127.0.0.1:4871',
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 4870,
    strictPort: true,
  },
})
