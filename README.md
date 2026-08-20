# Bali Tide Forecast — Landing Page

Astro implementation of the `Landing Page.html` design from the
[Claude Design project](https://claude.ai/design/p/ab91acd7-9dbc-418a-be3b-7c6a41580e85).

## Commands

| Command           | Action                                    |
| ----------------- | ----------------------------------------- |
| `npm install`     | Install dependencies                      |
| `npm run dev`     | Dev server at `localhost:4321`            |
| `npm run build`   | Build the static site to `./dist/`        |
| `npm run preview` | Preview the production build locally      |

## Structure

```
public/images/          screenshots, app icon, iPhone bezel SVG
src/layouts/Base.astro  <html> shell, meta/OG tags, global CSS import
src/pages/index.astro   composes the sections
src/components/
  Nav.astro             sticky header
  Hero.astro            headline + hero phone + tide wave divider
  Features.astro        4-up feature card grid (data-driven)
  FeatureRows.astro     alternating copy/screenshot rows (data-driven)
  Widgets.astro         Home Screen + Lock Screen widgets (data-driven)
  Watch.astro           Apple Watch section
  CallToAction.astro    closing download CTA
  Footer.astro          footer
  Phone.astro           reusable phone frame (screen + bezel overlay)
  StoreButtons.astro    App Store / Google Play button pair
src/styles/global.css   design tokens + all component styles
design/                 original design export, for reference
```

The site is fully static. The only client-side JavaScript is Vercel Web
Analytics (`<Analytics />` in `Base.astro`), which Astro inlines into the page.
It reports page views only when deployed on Vercel — locally it no-ops.
