# Sibo Zhou — Personal Website

A two-page academic website inspired by Physical Intelligence's restrained
typography and editorial layout.

- Home: introduction, background, contact details, and downloadable CV.
- Research: working papers and publications, with status and authorship from the CV.

The Research page lists three working papers and one published article in
`Cancers (Basel)` (2026), using the CV and the author's updated publication
citation. The published article links to its DOI and PubMed record.

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
as a static export for GitHub Pages. Both pages are pre-rendered HTML and work
without JavaScript. There are no runtime API, database, login, or server requirements.
The inherited Worker tooling is used during the build, not deployed to GitHub Pages.

Edit `app/page.tsx` for Home, `app/research/page.tsx` for papers, and
`app/globals.css` for the shared design. Replace `public/Sibo_Zhou_CV.pdf`
to update the downloadable CV.

## Deployment

Every push to `main` runs the GitHub Pages workflow and publishes `dist/client`
to [sibozhou.github.io/sibo_website](https://sibozhou.github.io/sibo_website/).
The Research page is available at `/sibo_website/research/`.
Repository Settings → Pages must use **GitHub Actions** as its source.

The workflow checks both generated pages, internal navigation, anchors, stylesheet
and script paths, and the PDF before uploading. An artifact-service failure happens
after the build and is not evidence of an application error; inspect the failing
step before changing repository permissions.
