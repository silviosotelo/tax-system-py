import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  
  // Configurar Vite para leer .env desde la raíz del proyecto
  envDir: path.resolve(__dirname, '..'),
  
  server: {
    port: 15000,
    host: true
  },
  
  build: {
    outDir: 'dist',
    sourcemap: true
  }
});