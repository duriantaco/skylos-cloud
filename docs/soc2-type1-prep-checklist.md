# SOC 2 Type I Prep Checklist

This is the practical pre-SOC 2 checklist for Skylos. It separates product evidence from non-product work.

## What The Product Already Helps Demonstrate

These are implementation-level items that are visible in the current repos.

- project-scoped API keys
- API key rotation
- organization and project boundaries
- project policy controls
- team member management in the dashboard
- billing and credit transaction tracking
- optional cloud upload instead of mandatory SaaS usage

These are useful evidence inputs, but they are not a SOC 2 program by themselves.

## What Is Still Missing Outside The Product

These are the normal blockers for early-stage teams before SOC 2 Type I.

- written access control policy
- written change management policy
- written incident response policy
- written vendor management policy
- written backup and restore policy
- asset inventory
- production access review process
- MFA enforcement policy
- employee onboarding and offboarding checklist
- documented subprocessor list
- documented retention and deletion policy
- legal review of privacy and DPA language

## 30-Day Prep Plan

### Week 1

- freeze the list of production systems and vendors
- name the system owner for Skylos Cloud
- document the real hosting stack
- document where uploaded scan data is stored
- document who can access production

### Week 2

- write the minimum policy set
- turn those policies into actual operating procedures
- define incident ownership and response expectations
- define backup and restore ownership

### Week 3

- collect evidence for current controls
- run an internal access review
- rotate any shared credentials that should not exist
- verify MFA posture across critical systems

### Week 4

- fill the vendor questionnaire pack
- review trust-center content for truthfulness
- choose the auditor or readiness partner
- start Type I scoping

## Evidence To Collect First

- project API key rotation screenshots
- dashboard policy screenshots
- team member management screenshots
- billing and credit transaction screenshots
- example scan upload and scan history screenshots
- GitHub workflow examples from `skylos cicd init`

## Messaging Rules Until The Audit Starts

Allowed:

- "We are pre-SOC 2."
- "We have a local-first product with optional cloud upload."
- "We can share a product-grounded security package and questionnaire answers."

Not allowed:

- "We are SOC 2 compliant."
- "SOC 2 is underway."
- "Enterprise-ready" without qualification.

## Internal Rule

Any public security claim should fall into one of these buckets:

- product behavior verified in code
- infrastructure fact confirmed by the deployment owner
- legal statement confirmed by legal

If it does not fit one of those buckets, do not publish it.

## Grounded Against

- `skylos/api.py`
- `skylos/sync.py`
- `skylos-cloud/src/app/dashboard/settings/page.tsx`
- `skylos-cloud/src/components/settings/ApiKeySection.tsx`
- `skylos-cloud/src/app/dashboard/billing/page.tsx`
- `skylos-cloud/src/app/api/credits/balance/route.ts`
