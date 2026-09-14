# Abdulaziz Aldoseri — Decision Science and Analytics



An Astro portfolio with React islands for a filterable project directory and interactive decision studies. A brief personal introduction leads into the Lab. The CV remains a quiet download; research details stay with their evidence.



## Local development



Use Node 22.12 or newer (verified here with Node 24.19.0). Install the locked dependencies with `npm ci`, then run `npm run dev`. Build with `npm run build` and inspect the static output with `npm run preview`. Both preview commands bind only to `127.0.0.1:4321`.



Astro 7 may run its server as a background process. Use `npx astro dev status` / `npx astro dev stop`, or the corresponding `preview` commands, to inspect and stop it. Stop the running server before switching from development to preview on the same port.



## Publishing

GitHub Pages uses the workflow in `.github/workflows/deploy.yml`. A push to `master` installs the locked dependencies with Node 24, builds Astro, and deploys only `dist/`. The workflow can also be started manually from `master`. Source branches remain available for local previews; a manual run on another branch cannot deploy.

Repository Settings → Pages must use **GitHub Actions** as its source. This is the `abdulaziz-aldoseri.github.io` user site, so Astro serves from `/` without a repository-name base path. Actions are pinned to verified revisions. The build receives read permissions; the deployment job receives only Pages and identity-token write permissions.



## Content and interaction



- `src/pages/`: interactive landing page with contact links, a CV download, project scopes and research evidence.

- `src/data/projects.ts`: project catalogue, sector, decision area, method, provenance and readiness labels.

- `src/components/ProjectDirectory.tsx`: search and multi-select filters. Choices within a facet are combined with OR; different facets use AND. Selected filters are preserved in the URL.

- `src/components/EnergyExplorer.tsx`: precomputed energy-study scenarios and accessible result tables. The Python solver does not run in the browser.

- `src/components/RetailExplorer.tsx` and `src/lib/retail.ts`: exact browser allocation from frozen historical inputs, reconciled with the Python evaluation. Whole-period evidence stays unprotected when a custom minimum is entered.

- `src/data/retail-index.json`: fixed product/week inputs, validation choice and full evaluation summaries.

- `src/data/energy-index.json` and `public/data/energy/days/`: verified summary and daily result exports.

- `public/files/`: intentionally selected public documents, including the canonical CV and the energy and retail reproduction packages.



New studies must distinguish observed data, scenario assumptions, model results and operational claims. Planned projects remain clearly labelled until their models and evaluations are complete. Source-specific attribution and licence terms are stated on each project page and inside its reproduction package.



## Durable links



The website root remains `https://abdulaziz-aldoseri.github.io/`. Existing project evidence files retain their `/files/…` URLs. `/projects/` and `/cv/` are retained. `/contact` and `/contact/` redirect to `/#contact` using a static HTML refresh with a visible fallback link. Contact is part of the homepage and is no longer a sitemap entry. `/experience/` now redirects to `/cv/`; `/publications/` redirects to the professional-work filter in the Lab. The three old published-report fragments open their specific title-filtered Lab results; the literature-review fragment opens the Minsky evidence section. Without JavaScript, the generic professional-work directory is the fallback. Cards link directly to the original publishers. Coauthor credits stay on those cards; the Minsky essay remains under research evidence.



Legacy HTML pages use static meta-refresh redirects with visible fallback links: `/about/` and `/about.html` to `/`; `/resume`, `/resume/`, `/resume.html` and `/cv.html` to `/cv/`; `/portfolio/` and `/portfolio.html` to `/projects/`. These are HTML redirects, not HTTP 301 responses. The four former project anchors identify the corresponding catalogue entries on `/projects/`, without a duplicate evidence index.



The two retired résumé PDF filenames remain absent. A PDF URL is never replaced with an HTML redirect. The current CV is the sole application download.



## Evidence



The energy reproduction ZIP includes frozen NESO source data, code, methodology, notebook, tests and evaluation outputs. It preserves the distinction between forecast-based schedules and the perfect-information bound. Earlier thesis and coursework archives retain their original evaluation limitations and authorship.



Private career records, archived CVs, development dependencies and release-working documents are not website assets. The original template licence is retained in `LICENSE`; third-party data and research documents keep their respective rights and attribution.



## Contact



Email is encoded in the client script and revealed as a selectable mail link only after a user action. This deters simple HTML-address scraping, not capable bots. The unchanged canonical CV still contains the address. Without JavaScript the homepage contact footer offers LinkedIn. Header Contact links go directly to that footer; no separate contact page is needed.



## Visual identity



A shared teal, copper and warm-ivory theme spans the homepage, directory and study pages. The chosen interactive homepage uses `HomeLabPreview.tsx` to expose existing evaluated storage-duration results. It displays the mean outcome and adverse days together, retains model qualifications and data attribution, and carries the selected duration into the full study. `ContactLinks.astro` provides the masked email reveal in the homepage footer.

The unselected design previews and the illustrative LP have been retired from active source. Private review archives retain them. The website root remains the canonical entry point. Interactive development across the rest of the Lab is a separate next phase; planned studies remain labelled until evaluated.
