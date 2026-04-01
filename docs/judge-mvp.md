# Skylos Judge MVP

## Goal

Ship a production-safe public Judge surface for the first 2-3 repos without coupling it to customer orgs, project credits, or request-time scanning.

## First repos

- `psf/black`
- `networkx/networkx`
- `mitmproxy/mitmproxy`

## Production boundary

- Public Judge data lives in dedicated tables: `judge_repos`, `judge_repo_snapshots`, `judge_jobs`, `judge_suggestions`
- Customer scans continue to use `projects`, `scans`, `findings`, and `/api/report`
- Judge scores are deterministic and based on Skylos static output only
- Skylos agent is supported as an optional second pass, but it does not change the public grade
- Public users suggest repos into a queue; they do not manually upload grades

## Public submission flow

1. Public page posts to:
   `POST /api/judge/suggestions`
2. Suggestion is stored in `judge_suggestions` with requested analysis modes:
   `["static"]` or `["static","agent"]`
3. Admin reviews the queue:
   `GET /api/judge/admin/suggestions`
4. Admin promotes a suggestion into `judge_repos` and `judge_jobs`:
   `POST /api/judge/admin/suggestions`

## Seed and queue flow

1. Seed the initial repos:
   `POST /api/judge/admin/seed`
2. Admin or seed flow creates a `judge_jobs` row with:
   - `requested_analysis_modes`
   - `static_status`
   - `agent_status`
3. External worker picks up a pending Judge job.
4. Worker shallow-clones the default branch at a pinned commit in an isolated container.
5. Worker runs Skylos static first.
6. Worker optionally runs Skylos agent if `requested_analysis_modes` includes `agent`.
7. Worker imports each immutable snapshot:
   `POST /api/judge/admin/import`
8. Public pages read the latest static snapshot at:
   `/judge`
   `/judge/[owner]/[repo]`

## Snapshot model

- `judge_repo_snapshots.analysis_kind` is either `static` or `agent`
- One snapshot exists per:
  `repo + commit_sha + scoring_version + analysis_kind`
- Static snapshots drive:
  - overall grade
  - security score
  - quality score
  - dead code score
  - public history
- Agent snapshots are stored separately for:
  - deeper explanation
  - future reasoning layers
  - queue visibility

## Why no forks

- Forks create maintenance and freshness problems.
- Public read-only cloning is enough for deterministic grading.
- Judge should be a snapshot system, not a mirror-hosting system.

## Import contract

`/api/judge/admin/import` expects:

- `repo.owner`
- `repo.name`
- `snapshot.commit_sha`
- `snapshot.analysis_kind`
- `report`

Optional snapshot metadata:

- `snapshot.branch`
- `snapshot.scanned_at`
- `snapshot.skylos_version`
- `snapshot.confidence_score`
- `snapshot.fairness_notes`
- `snapshot.job_id`
- `snapshot.analysis_mode`
- `snapshot.ingest_source`

Import behavior:

- static import marks `judge_jobs.static_status = succeeded`
- agent import marks `judge_jobs.agent_status = succeeded`
- overall `judge_jobs.status` only becomes `succeeded` when all requested analysis modes are done

## Env

- `JUDGE_ADMIN_TOKEN`

## Operator notes

- Future libraries should enter Judge through the suggestion or seed queue, not by hand-editing public rows.
- Users suggest public GitHub repos. They do not submit arbitrary result files.
- Worker execution should always pin commit SHA, run in isolation, and import immutable snapshots back into Judge.

## Current scoring

- Security: 45%
- Quality: 30%
- Dead code: 25%

Confidence is stored separately and displayed as scan context instead of directly changing the grade.
