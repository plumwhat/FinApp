import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  // This is the essential line for deploying to a GitHub Pages subfolder
  base: "/FinApp/",

  // This is required for React projects
  plugins: [react()],

  // This section keeps your custom import path for '@'
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.')
    }
  }
});