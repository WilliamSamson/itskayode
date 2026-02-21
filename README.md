# Kayode Portfolio

Production-ready personal portfolio built with Next.js App Router, TypeScript, and Tailwind CSS.

## Project

- Folder: `itskayode`
- Package: `kayode-portfolio`
- Branding: Kayode Williams Olalere
- Site title: Kayode Olalere — Portfolio

## Stack

- Next.js (App Router)
- TypeScript (strict)
- Tailwind CSS with tokenized design system
- Framer Motion (subtle transitions)
- Client-side contact form (mailto handoff)
- ESLint + Prettier
- next-sitemap
- Vitest

## Quick Start

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Scripts

```bash
npm run dev
npm run lint
npm run typecheck
npm run test
npm run build
npm run start
npm run format
npm run format:check
```

## Environment Variables

Use a single `.env` file at project root.

Required:

- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_PHONE_NUMBER`
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`

Firebase env values are mapped in `src/lib/firebase-config.ts` for client integration and hosting setup.

## Contact Form (Client Side)

- Validation: name, email, message length.
- Delivery: opens the user's email client using `mailto:`.
- UI states: idle, success, error (no toasts).

## Design Tokens

Defined in `src/app/globals.css` and mapped in `tailwind.config.ts`:

- `--bg`
- `--surface`
- `--text`
- `--muted`
- `--accent-red`
- `--accent-blue`
- `--border`

## Sitemap and Robots

`next-sitemap` runs automatically after build via:

```bash
npm run build
```

This generates:

- `public/sitemap.xml`
- `public/robots.txt`

## Deployment (Firebase Hosting - Static)

1. Build static output:
`npm run build`
2. Deploy:
`firebase deploy --only hosting`

## Notes

- The CV download path currently points to `public/cv/kayode-olalere-cv.pdf` (placeholder file included).
- Project screenshots in `public/images` are placeholders and should be replaced with real assets.
