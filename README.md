# Sibo Zhou — Research

A concise academic profile for Sibo Zhou, focused on research, appointments,
teaching, and a downloadable CV.

## Development

Requires Node.js 22.13 or newer.

```bash
npm ci
npm run dev
```

Run the production build and rendered-content checks with:

```bash
npm test
```

The site uses Next-compatible React components through vinext and is packaged
as a static export for GitHub Pages.

## Deployment

Every push to `main` runs the GitHub Pages workflow and publishes `dist/client`
to [sibozhou.github.io/sibo_website](https://sibozhou.github.io/sibo_website/).
