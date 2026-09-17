# Sibo Zhou — Personal Website

A two-page academic website inspired by Physical Intelligence's restrained
typography and editorial layout.

- Home: introduction, background, recognition and media, contact details, and downloadable CV.
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

Every push to `main` runs the GitHub Pages workflow and publishes `dist/client`.
The intended primary address is [sibozhou.com](https://sibozhou.com/),
with the Research page at `/research/`.
Repository Settings → Pages must use **GitHub Actions** as its source.
The workflow reads the configured Pages URL and builds assets for its base path,
supporting both the original project URL and the custom domain during migration.
Canonical URLs and social metadata use `https://sibozhou.com/`.

### One-time custom-domain setup

1. In GitHub repository Settings → Pages, set **Custom domain** to
   `sibozhou.com` and save, before changing DNS.
2. In Namecheap → Domain List → sibozhou.com → Manage → Advanced DNS,
   replace conflicting parking or URL Redirect records for `@` and `www`
   with the following records (TTL: Automatic). Preserve email and other
   unrelated records.

   | Type | Host | Value |
   | --- | --- | --- |
   | A | @ | 185.199.108.153 |
   | A | @ | 185.199.109.153 |
   | A | @ | 185.199.110.153 |
   | A | @ | 185.199.111.153 |
   | CNAME | www | sibozhou.github.io |

3. Run the deployment workflow after saving the GitHub custom domain so the
   asset base path becomes `/`.
4. When GitHub's DNS check and certificate provisioning finish, enable
   **Enforce HTTPS**. DNS and certificate provisioning can take up to 24 hours.
5. Check Home, Research, the portrait, and the CV at the custom domain,
   plus the redirect from `www.sibozhou.com`.

Custom Actions deployments use the domain configured in GitHub Pages settings;
a repository `CNAME` file does not configure the domain for this workflow.

References: [GitHub custom domains](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)
and [Namecheap's GitHub Pages guide](https://www.namecheap.com/support/knowledgebase/article.aspx/9645/2208/how-do-i-link-my-domain-to-github-pages/).

The workflow checks both generated pages, internal navigation, anchors, stylesheet
and script paths, and the PDF before uploading. An artifact-service failure happens
after the build and is not evidence of an application error; inspect the failing
step before changing repository permissions.
