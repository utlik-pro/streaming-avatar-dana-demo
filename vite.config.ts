import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: process.env.GITHUB_ACTIONS ? '/akool-streaming-avatar-react-demo' : '/streaming/avatar',
  server: {
    host: '0.0.0.0'
  },
})
