import { defineConfig } from 'astro/config';

import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://balitideforecast.app',
  integrations: [sitemap()],
});