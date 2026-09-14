import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

export default defineConfig({
  site: 'https://abdulaziz-aldoseri.github.io',
  output: 'static',
  trailingSlash: 'ignore',
  integrations: [react()],
  devToolbar: { enabled: false },
});
