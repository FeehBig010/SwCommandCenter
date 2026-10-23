import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import {assetPublicPlugin} from './server/public-assets.js';
export default defineConfig({plugins:[react(),assetPublicPlugin()],build:{copyPublicDir:false,rollupOptions:{output:{manualChunks(id){if(id.includes('monster-skills.json'))return 'skill-data';if(id.endsWith('/monster-metadata.json'))return 'monster-data';if(/node_modules\/(react|react-dom|scheduler)\//.test(id))return 'react-vendor';if(id.includes('node_modules/@supabase/')||id.includes('node_modules/iceberg-js/'))return 'supabase';}}}}});
