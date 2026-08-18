# Contributing

This repo uses trunk-based development. `main` is the only long-lived branch and stays releasable.

## Branching

1. Update `main`.
2. Create a short-lived branch named `type/short-description` (`feat/plugin-manifest`, `fix/ci-gate`).
3. Open a pull request into `main`.
4. Squash-merge after review and CI.
5. GitHub deletes the branch on merge.

Do not use Git Flow. No `develop`, `release/*`, or `hotfix/*` branches. One concern per PR.

```bash
git clone https://github.com/ChuckkNorris/precision-marketplace.git
cd precision-marketplace
git checkout main && git pull
git checkout -b feat/your-change
```

## Pull requests

Merging into `main` requires:

- 1 approving review
- All review conversations resolved
- The `CI` check green on the latest commit (the branch must be up to date with `main`)
- Squash merge only

Repository admins and organization admins can bypass those rules on a pull request. Use that for emergencies, not the default path. Direct pushes to `main` are blocked.

Rules live in the [Trunk protection](https://github.com/ChuckkNorris/precision-marketplace/rules) ruleset.

## CI

`.github/workflows/ci.yml` is the merge gate. The required check is named `CI`.

Add new jobs to that workflow and list them under the `CI` job's `needs` so the ruleset does not need an update.
