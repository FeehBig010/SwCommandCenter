import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({plugins:[react()],build:{rollupOptions:{output:{manualChunks(id){if(id.endsWith('/monster-metadata.json'))return 'monster-data';if(/node_modules\/(react|react-dom|scheduler)\//.test(id))return 'react-vendor';if(id.includes('/node_modules/html-to-image/'))return 'png-export';if(id.includes('node_modules/@supabase/')||id.includes('node_modules/iceberg-js/'))return 'supabase';}}}}});
