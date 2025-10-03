---
type: "agent_requested"
description: "Critical standards to follow for git branching"
---

# Branching Strategy Rules (For the AI Agent)

## Branch Roles
- Treat `upstream/master` as canonical upstream; it contains NO custom work from this fork.
- Treat `master` (this fork) as a pristine mirror of `upstream/master`. Never commit directly.
- Use topic branches for focused custom work (based on `upstream/master`): e.g., `docs/custom-ai`, `feature/custom-ai-core`, `feature/custom-ai-electron`, `chore/env-samples`, `build/deps`.
- Treat `fork/main` as the integration branch (default). It is rebuilt by merging topic branches on top of `upstream/master`. Never commit directly.

## Base Branch Selection (Decision Logic)
- Default: Branch from the smallest relevant topic branch that contains required custom work.
- If multiple custom areas are required together: Branch from `origin/fork/main`.
- Rare/exceptional: Branch from `upstream/master` (or local `master`) only for upstream-only fixes or explicit isolation/parity experiments.

## Commands: Creating Branches
- From a specific topic branch (default when extending a custom area):
  - `git fetch origin`
  - `git checkout -b feature/<name> origin/feature/custom-ai-core`
- From `fork/main` (when multiple custom areas are needed together):
  - `git fetch origin`
  - `git checkout -b feature/<name> origin/fork/main`
- Rare: From `upstream/master` (upstream-only or isolation/parity):
  - `git fetch upstream`
  - `git checkout -b fix/upstream-only upstream/master`

## Keep Topic Branches Current (Rebase Workflow)
- Rebase topic branches onto `upstream/master` regularly:
  - `git fetch upstream`
  - `git checkout <topic-branch>`
  - `git rebase upstream/master`
  - Resolve conflicts → `git add <files>` → `git rebase --continue`
  - Push safely after history rewrite: `git push --force-with-lease`

## Rebuild Integration Locally (Only if needed)
- If `fork/main` is needed before automation runs:
  - `git fetch origin upstream`
  - `git checkout -B fork/main upstream/master`
  - `git merge --no-ff origin/docs/custom-ai -m "merge: docs/custom-ai"`
  - `git merge --no-ff origin/feature/custom-ai-core -m "merge: feature/custom-ai-core"`
  - `git merge --no-ff origin/feature/custom-ai-electron -m "merge: feature/custom-ai-electron"`
  - `git merge --no-ff origin/chore/env-samples -m "merge: chore/env-samples"`
  - `git merge --no-ff origin/build/deps -m "merge: build/deps"`
  - `git push --force-with-lease origin fork/main`

## Automation
- A scheduled GitHub Action resets `master` to `upstream/master` and rebuilds `fork/main` by merging topic branches daily at 06:00 UTC (and on manual dispatch).
- Do not commit directly to `fork/main` or `master`; let automation (or the local rebuild procedure above) update them.

## Prohibitions & Safety
- Never commit directly to `fork/main` or `master`.
- When rebasing or amending topic branches, always use `git push --force-with-lease`.
- Ensure `newIDE/electron-app/.env.local` stays untracked; use `.env.local.example` templates for committed samples.
- If branch protections block force-push to `master`/`fork/main`, expect automation failures; only switch to PR-based automation if explicitly instructed.
