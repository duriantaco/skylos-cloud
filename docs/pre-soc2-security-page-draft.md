# Pre-SOC 2 Security Page Draft

This draft is intentionally conservative. It only claims product behavior that is visible in the current repos.

Do not publish infrastructure, encryption, retention, audit, legal, or compliance claims until the owner of the deployment confirms them.

## Draft Copy

## Security and Data Handling

Skylos is an open-source code scanner with an optional cloud dashboard.

You can run Skylos fully locally in your terminal or CI without sending code anywhere. The CLI, CI workflow, SARIF output, baseline flow, and AI defense checks all work without the cloud dashboard.

Skylos Cloud is optional. When you connect a project and upload a scan, Skylos Cloud stores the scan results so your team can review history, gate outcomes, suppress findings, configure policy, and collaborate in the dashboard.

## What Runs Locally

- local code scanning
- dead code detection
- security rules
- secrets detection
- quality checks
- baseline comparison
- SARIF generation
- AI defense checks through `skylos defend`

## What Gets Sent to Skylos Cloud

If you explicitly use cloud features like `skylos login`, `--upload`, or dashboard-connected workflows, Skylos Cloud receives scan data and project metadata needed to power the dashboard.

That can include:

- project identity
- branch and commit metadata
- findings
- file paths
- snippets included in findings
- grade and gate metadata
- AI provenance summaries if present
- AI defense summaries if uploaded

Skylos does not require cloud upload to provide core CLI analysis.

## Access Model

Skylos Cloud supports organization and project-based access control.

Current shipped controls include:

- workspace and project separation
- project-scoped API keys for CLI and CI uploads
- API key rotation in the dashboard
- team member management in the dashboard
- project policy configuration in the dashboard

## GitHub Integration

Skylos supports:

- GitHub OAuth for dashboard login
- GitHub repository linking at project creation
- GitHub Actions workflow generation through `skylos cicd init`
- optional GitHub App installation from dashboard settings
- optional SARIF-based workflows for GitHub code scanning

## Billing Model

Skylos Cloud uses one-time credit purchases.

- credits never expire
- buying any pack activates Pro access for a fixed time window
- Free users can still use the open-source CLI and upload scans
- paid cloud features unlock through credit packs and Pro status

## What We Can Share Today

For security review conversations, we can currently share product-grounded information about:

- local-first deployment model
- optional cloud upload model
- API key and project model
- team and policy controls in the dashboard
- GitHub integration paths
- billing and feature gating model

## What We Should Not Claim Yet

Do not claim any of the following until they are separately confirmed:

- SOC 2 compliance
- SOC 2 in progress
- ISO 27001
- SSO or SAML
- SCIM
- BYOK or customer-managed keys
- data residency commitments
- private VPC or on-prem deployment
- encryption at rest details
- encryption in transit details
- backup and DR guarantees
- formal incident response SLAs
- pentest results
- DPA language

## Recommended Trust Center Contents

Publish these first:

- this security page
- product architecture diagram
- data flow diagram
- subprocessors list
- privacy policy
- terms
- security contact
- vendor questionnaire intake contact
- a short statement on what cloud upload does and does not do

## Internal Notes

The strongest trust angle for Skylos today is not enterprise certification. It is low-friction adoption:

- local CLI first
- cloud optional
- explicit upload step
- project-scoped API keys
- no subscription lock-in

That is the angle to lead with until formal assurance is in place.

## Grounded Against

- `skylos/README.md`
- `skylos/api.py`
- `skylos/login.py`
- `skylos/sync.py`
- `skylos-cloud/src/app/dashboard/settings/page.tsx`
- `skylos-cloud/src/components/settings/ApiKeySection.tsx`
- `skylos-cloud/src/app/dashboard/billing/page.tsx`
- `skylos-cloud/src/app/api/report/route.ts`
- `skylos-cloud/src/app/api/projects/route.ts`
