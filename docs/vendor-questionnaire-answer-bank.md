# Vendor Questionnaire Answer Bank

This is a pre-SOC 2 answer bank for sales calls, security questionnaires, and CAIQ prep.

It is split into three groups:

- ready to answer from the product today
- requires ops or legal confirmation before sending
- do not claim

## Ready to Answer From the Product

### Product Model

Q: What is Skylos?

A: Skylos is an open-source code scanner with an optional cloud dashboard. Teams can run the CLI locally or in CI without using the cloud dashboard.

### Deployment Model

Q: Does code have to be uploaded to your cloud to use the product?

A: No. The CLI can run locally and in CI without sending code to Skylos Cloud. Cloud upload is optional and is used for dashboard history, policy, suppression, and team workflows.

### Upload Model

Q: What data is uploaded when a customer uses Skylos Cloud?

A: Scan uploads include project metadata and scan results needed for the dashboard. That can include findings, file paths, snippets attached to findings, branch and commit metadata, gate results, grades, AI provenance summaries, and AI defense results if those are uploaded.

### Authentication

Q: How do users authenticate?

A: The dashboard uses GitHub OAuth for user login. CLI and CI uploads use project-scoped API keys. API keys can be rotated from the dashboard.

### Project Isolation

Q: How is customer data separated?

A: Skylos Cloud is organized around organizations and projects. API keys are project-scoped, policy is project-scoped, and dashboard access is tied to organization and project membership.

### Policy Controls

Q: Can customers configure policy?

A: Yes. Customers can configure project analysis policy in the dashboard, including enabled categories, gate mode, severity thresholds, category thresholds, exclude paths, and AI assurance settings. CLI users can sync that policy locally with `skylos sync pull`.

### Suppressions

Q: Can customers suppress findings?

A: Yes. Findings can be suppressed in the dashboard with a reason and optional expiry. Future scans can inherit that suppression state. CLI users can sync suppressions with `skylos sync pull`.

### CI/CD

Q: How do customers integrate Skylos in CI?

A: The CLI ships a GitHub Actions generator through `skylos cicd init`. Skylos also supports SARIF output for GitHub code scanning workflows.

### GitHub Integration

Q: Is there a GitHub integration?

A: Yes. The product supports GitHub OAuth for login, repository linking at project creation, GitHub Actions workflow generation, and an optional GitHub App installation flow in the dashboard.

### Billing

Q: How is the paid product sold?

A: Skylos Cloud uses one-time credit purchases. Credits do not expire. Buying any pack activates Pro access for a time-limited window.

## Requires Ops or Legal Confirmation Before Sending

Only send these after confirmation from the actual deployment owner or legal owner.

### Encryption

- exact encryption-at-rest statement
- exact encryption-in-transit statement

### Hosting and Subprocessors

- production hosting providers
- database hosting provider
- region and residency commitments
- subprocessor list

### Security Operations

- logging retention
- monitoring and alerting commitments
- backup frequency
- disaster recovery and restore targets
- vulnerability management process
- incident response process and notification timeline

### Legal and Privacy

- DPA availability
- data retention commitments
- deletion timelines
- breach notification language
- privacy policy language for uploaded scan data

### Assurance

- pentest frequency
- third-party assessment status
- SOC 2 timeline

## Do Not Claim

Do not claim these today unless they are separately implemented and verified.

- SOC 2 certified
- SOC 2 Type I complete
- SOC 2 Type II complete
- ISO 27001
- SAML SSO
- SCIM
- customer-managed keys
- on-prem deployment
- private VPC deployment
- dedicated single-tenant deployment

## CAIQ Prep Notes

Use this answer bank to prepare a real CAIQ response, but do not treat this document as a completed CAIQ.

Current status:

- product architecture questions: mostly answerable
- authentication and access questions: mostly answerable
- logging, monitoring, DR, and incident questions: not answerable from the repos alone
- legal and privacy questions: not answerable from the repos alone

## Best Sales Positioning Before SOC 2

Say:

- Skylos is local-first
- cloud upload is optional
- project-scoped API keys and dashboard policy controls are shipped
- we can answer product architecture questions now
- formal assurance is still being built

Do not say:

- we are enterprise-ready in the broad procurement sense
- we already satisfy a buyer's full vendor questionnaire if ops and legal sections are still blank

## Grounded Against

- `skylos/README.md`
- `skylos/api.py`
- `skylos/sync.py`
- `skylos-cloud/src/app/api/report/route.ts`
- `skylos-cloud/src/app/api/projects/route.ts`
- `skylos-cloud/src/app/api/policy/route.ts`
- `skylos-cloud/src/app/api/credits/balance/route.ts`
- `skylos-cloud/src/app/dashboard/settings/page.tsx`
- `skylos-cloud/src/app/dashboard/billing/page.tsx`
