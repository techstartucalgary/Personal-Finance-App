# Sterling — Landing Page

Marketing site for **Sterling**, a personal finance app.

Built with Vite + React + TypeScript + Tailwind CSS. Static-output, deployable anywhere.

## Develop

```bash
npm install
npm run dev
```

Open http://localhost:5173.

## Build for production

```bash
npm run build
```

Output is written to `dist/`. Deploy that folder to Vercel, Netlify, Cloudflare Pages, GitHub Pages, S3 + CloudFront, or any static host.

## Project structure

```
landing/
  src/
    components/        Section components (Hero, Nav, Footer, Feature*, etc.)
    App.tsx            Page composition
    index.css          Global styles + Tailwind layers
    main.tsx           Entry
  public/
    logo.png           Sterling app icon
    screens/           Real iOS screenshots (used in mockups)
  tailwind.config.js   Brand tokens (peri / cream / ink / sand / leaf)
  index.html
```

## Brand tokens

The Tailwind config encodes Sterling's palette so everything stays on-brand:

- `ink-800` — warm dark backgrounds (logo background tone)
- `peri-400` — periwinkle blue (logo S-curve)
- `cream-200` — champagne accent (logo sparkle)
- `sand-50 / sand-100` — light beige backgrounds
- `leaf-400 / 500` — goal/budget progress green

## Notes on copy

All marketing copy is grounded in the actual app feature set (verified against the Sterling React Native source in `../Personal-Finance-App-main/`):

- 4-step onboarding (welcome → profile → currency → consent)
- Dashboard with total / available / accounts / 5-month balance trend
- Plaid bank linking + manual accounts (CAD & USD)
- Manual + recurring transactions (daily / weekly / monthly / yearly rules)
- Targets = Goals (with account allocation) + Budgets (period-based, by category)
- 12 notification toggles across spending / budget / goals / credit

No fabricated screenshots — every phone mockup uses real shots from `public/screens/`.
