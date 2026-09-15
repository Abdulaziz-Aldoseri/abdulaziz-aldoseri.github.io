# Independent study template — version 2.1.0

Reusable source of truth for Abdulaziz Aldoseri's Decision Lab. Adopted 14 September 2026. This is an Astro repository template, not a Sites-hosted template or a new CV. The shared presentation is implemented in `src/components/StudyHeader.astro`, `DecisionBrief.astro` and `StudyEvidence.astro`; `src/data/studies.ts` contains display adapters. Each study retains its own model, explorer and frozen evidence.

## One reading sequence

1. **Practical introduction.** Ask a concrete decision question. State who would make the decision, the setting, period and why the trade-off matters. Identify independent work and source provenance. Explain any proxy before results.
2. **Decision brief.** State controllable choices, objective and units, available information, scenario inputs and binding constraints before controls. Keep the principal limitation visible. Put equations, algorithms and policy details in expandable supporting material.
3. **Interactive comparison.** Explain what each control changes and what the model chooses. Show a valid predetermined reference, baseline, consequence and concise interpretation. Label precomputed results, browser solves and simulations accurately. Show infeasibility without stale output; provide reset, no-JavaScript content and meaningful keyboard operation. Prefer direct controls and keep them beside their results; use the interaction rules below.
4. **Complete evidence.** Show all evaluation cases and relevant segments, including ties and adverse comparisons. Derive copy from frozen outputs or assert its exact rounding. Name the score, direction, comparator, assumptions and units. A forecast objective is different from a later decision consequence.
5. **Method and limits.** Describe preparation, information timing, exclusions, calibration, constraints, solution verification and missing operational inputs. Distinguish descriptive historical planning, prediction and simulation. Do not invent a held-out evaluation where it is inapplicable.
6. **Sources and reproduction.** Give original sources, exact credits and reuse terms, retrieval/version information, transformations and one **Open in Google Colab** link. The notebook must automatically load all data, code and complete results needed to reproduce the study, without a separate ZIP or data upload. Keep dataset attribution and licence links, but do not add notebook/ZIP/CSV download cards or supplemental data-download links to the page. Explain package contents and actual execution environment in the notebook. Hosted Colab compatibility is not proof of a hosted run.

## Presentation files

- `StudyHeader` accepts a typed `StudyDisplay` adapter: ID, canonical route, order, sector, year, plain-text title, introduction, context, template version, evidence state and existing section anchors. Use natural title wrapping so mobile text cannot join across a hidden line break.
- `DecisionBrief` accepts the anchor, title and labelled plain-text definition items. Its default slot holds scenario explanation, domain equations, policies and scope. Ensure constraints are visible before the explorer.
- `StudyEvidence` accepts a title and one `notebook` ID from `src/data/colab-notebooks.json`, a named `description` slot and a default slot for exact source links/credits. It renders one Colab action and a short automatic-setup explanation. Licence-specific wording must remain source-specific.
- Study explorers and scientific payloads stay separate. Reuse formatting only when quantities and semantics match. Do not force aircraft, staff, energy and bicycle results into the same score or solver.

Use `study-page.astro.example` as the starter. It is intentionally outside `src/pages`; placeholders must not build into public routes. Copy the structure, fill it from verified evidence, and use the shared components. Never copy a project's numerical findings into a new study.

## Direct controls and visible feedback

Use dropdowns only when a short list clearly works better than a direct control; document that exception. Do not use long dropdowns for dates, stations, products, capacities or scenario grids. Prefer visible preset buttons, segmented choices, sliders or dials with readable values, date stepping and clickable plots. A dial is optional, not a reason to replace a clearer accessible slider.

Keep adjustments beside the result they change. Use the shared `StudyWorkbench` and `StudyControlPanel` for a persistent desktop sidebar; on mobile, use the compact expandable control tray with a current outcome visible even when collapsed. Keep enough of the plot visible while adjusting. Do not require visitors to scroll away to find controls and then scroll back to see their effect. Put local week/month/entity controls directly beside that detail view, and let plotted points or tiles select it where meaningful. Changing a nearby control must retain keyboard focus and scroll position; reserve deliberate navigation/focus changes for an explicit “Inspect” action from another evidence section.

Use `ChoiceControl` for small categorical sets, `StepControl` for ordered admitted values, and `SearchChoice` for long station/product sets. Sliders must map to exact evaluated values (or the original model's accepted domain), with labels, units, visible current values, `aria-valuetext`, keyboard support and previous/next steps. Do not imply continuous evaluation between a precomputed grid's points. Search results are a bounded visible list, with all matches reachable through search/paging; do not replace a long dropdown with hundreds of buttons.

Presets must name the assumptions they change and use supported scenarios. Preserve a clear reference/reset action, adverse cases, infeasibility and baseline semantics. Keep input choices visible during loading or error, but hide old output in both the plot and the compact outcome summary. Plot interactions need meaningful accessible names, visible selected state and keyboard equivalents; keep exact tables as supporting evidence.

Check desktop, narrow mobile and short landscape views. A sticky panel must not cover focus targets, trap scrolling or consume the whole screen. Test changing a scenario while viewing the affected plot, not only clicking the controls at the top of the page. Record any justified dropdown exception in the study handoff.

## Single-link notebook delivery

Generate the Colab edition with `python scripts/build_colab_notebooks.py`. It retains the reviewed analysis cells and loads the existing reproduction package automatically, checking its pinned SHA-256 and size before extraction or imports. Keep original notebooks, packages, data and model results immutable; delivery notebooks live in `public/notebooks/` and are tracked separately in `src/data/colab-notebooks.json`. All required prepared inputs and complete results belong in the package; original-source retrieval details remain attributed where full raw redistribution is inappropriate.

A Colab URL opens the notebook in the public GitHub deployment branch. Local unpublished files are not yet reachable by Colab. Verify the deployed notebook and automatic package fetch after publication; before then, record local delivery checks and the pending remote check honestly. No Drive mount, account creation or manual data-upload step belongs in setup.

## Required companion records

Create a private project folder under `materials/projects/<study-id>/` with:

- `PROJECT_BRIEF.md` / `PROTOCOL.json`: bounded question, formulation, information set, baseline, evaluation applicability, cases and predefined reference.
- `sources/` and a source register: publisher, original URL and exact resource/query, licence, timestamp, bytes, hashes, grain/units/time zone, coverage and admitted scope. Retain immutable originals privately; redistribute only permitted and necessary data.
- Preparation code and report: every transformation, exclusion, missingness decision and reconciliation count. Classify inputs as observed, derived, scenario assumptions or outputs.
- Model/evaluation code, frozen configuration and outputs, including feasibility, tolerances, solver status/gap where applicable, limiting cases and adverse results. Freeze choices before inspecting evaluation results; record any correction or post-hoc diagnostic honestly.
- Reproduction notebook, pinned requirements, tests and a public-package allowlist with hashes. Validate extraction before importing code; reject unsafe paths, symlinks, duplicate/colliding names and unexpected files. Test the exact final archive in a clean folder.
- `HANDOFF.md`: source/code/output versions, unresolved limits, actual verification and publication status.

Under `materials/website/releases/<milestone>/`, retain audit, download inventory, verification, release notes, source snapshot/patch, desktop/mobile evidence and multi-agent adversarial reviews. Close blockers and re-review corrected areas before declaring the milestone complete.

## Admission and evidence gates

**Planned** means a brief with proposed methods; it cannot expose result controls, numerical findings or missing downloads. **Evaluated** requires the source/model/reproduction gates to pass. **Independently reviewed** records completed adversarial review and closed blockers. **Published** is a separate execution event attached to an exact commit; evaluation does not authorize publishing.

For predictive studies, freeze chronology, cohort and tuning before evaluation. For a historical deterministic planning envelope, record why train/validation/test is not applicable and call its known inputs retrospective. For simulation, define state transitions, conservation, initialization, randomness/replications if applicable and what is assumed. Use one credible feasible simple baseline under the same information, resource limits and objective interpretation. A perfect-information comparator must be labelled as unattainable at the decision time.

Every external dataset needs open reuse rights and attribution. Missing costs, handle times, fleet availability, latent demand and dispatch feasibility must remain missing or explicit hypothetical controls. Do not turn scenario assumptions into fabricated observed records. No airline/telecom employment, deployment, realized savings or service-improvement claim follows from an independent study.

## Five-study application matrix

| Study | Decision | Evidence design | Critical distinction |
| --- | --- | --- | --- |
| Energy | Half-hour storage schedule | Frozen forecast-based historical evaluation | MW peak relief is not investment return; retain adverse days and solver-tie diagnostic. |
| Mobility | Conserved integer bike transfers | Rolling historical forecast evaluation | Recorded-flow balance is not stockouts, dispatch feasibility or rider impact. |
| Retail | Whole product-unit allocations | Rolling historical activity scenarios | Positive invoice activity does not establish fulfilment or latent demand; weighted mismatch is not measured lost sales. |
| Airline fleet | Aircraft counts by type and aggregate service allocation | Retrospective historical capacity planning | Monthly hour/seat coverage does not establish feasible timetables or procurement economics. |
| Telecom staff | Whole staff allocation across work queues | Historical intake with hypothetical processing capacity | FCC complaints are regulator intake; simulated casework backlog is not an operator queue or measured SLA. |

The last two studies must pass their own evidence gates. Equal sector prominence means equal card treatment and access, not identical methods or artificial positive results. Historical thesis/coursework/professional evidence retains its original provenance and is not relabelled an independent study.

## Reuse and change control

Keep `templateVersion` separate from `evidenceVersion`. Presentation fixes may adopt a new template without rewriting source data, models, results or download bytes. Changing data, policy or evaluation requires a new evidence version and affected-area review; an already-inspected test set is not fresh validation. Version patch changes for compatible copy/accessibility fixes, minor changes for optional fields and major changes for required contract changes. Record project-specific exceptions explicitly.

Before adopting a template update, hash existing scientific assets and downloads; verify reference figures, routes, anchors and interaction state after adoption. Check desktop and narrow mobile layouts, keyboard tables, direct URLs, no-JavaScript content, failed/empty/infeasible states where applicable, source links and download byte parity. Keep the canonical CV and durable website root intact. Private career records never enter public source or reproduction packages.
