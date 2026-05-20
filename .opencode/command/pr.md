---
allowed-tools: Bash(git status:*), Bash(git log:*), Bash(git diff:*), Bash(git push:*), Bash(git checkout:*), Bash(git branch:*), Bash(git pull:*), Bash(npm run lint:*), Bash(npm run typecheck:*), Bash(npm run test:*), Bash(gh pr create:*), Bash(gh pr edit:*), Bash(gh pr merge:*), Bash(gh pr view:*), Bash(gh issue:*)
description: Create a pull request from current branch to develop
---

## Context

- Current branch: !`git branch --show-current`
- Commits ahead of develop: !`git log develop..HEAD --oneline`
- Diff vs develop: !`git diff develop..HEAD --stat`
- Uncommitted changes: !`git status --short`

## Task

Create a Pull Request from the current branch into `develop`.

**Rules (non-negotiable):**
- PR title and body MUST be in **English** — always, no exceptions
- Never target `main` directly — PRs always go to `develop`
- If there are uncommitted changes, STOP and warn the user before proceeding
- Branch name MUST match: `^(feat|fix|chore|docs|style|refactor|perf|test|build|ci|revert)\/[a-z0-9._-]+$`
- Never add `Co-Authored-By` or AI attribution trailers

**Steps:**
1. Verify branch name matches the required pattern.
2. Detect whether the changes are documentation-only.
3. If changes are documentation-only, skip tests and explain why in the PR body.
4. If changes are not documentation-only, run the MeshFlow backend checks:
   - `npm run lint`
   - `npm run typecheck`
   - `npm run test:unit`
   - `npm run test:integration`
5. If any check fails, STOP and warn the user before proceeding.
6. Push branch to remote: `git push -u origin HEAD`.
7. Draft the PR title and body using the template below. **Show the full draft to the user and STOP — wait for explicit confirmation before creating the PR.**
8. Once confirmed, create the PR with `gh pr create --base develop`.
9. Add the corresponding `type:*` label to the PR using `gh pr edit <number> --add-label "type:<label>"`.
10. Show the PR URL and STOP — wait for user confirmation before proceeding to merge.

---

**PR title format:** `<type>(<scope>): <short imperative description>` — max 70 chars

Examples:
- `fix(auth): persist refresh sessions securely`
- `feat(app_store): add remote registry sync`
- `ci(core): run backend checks in pull requests`

---

**PR body template** (follows `.github/PULL_REQUEST_TEMPLATE.md`):

```markdown
## 🔗 Linked Issue

<!-- Solo developer — create a tracking issue if one doesn't exist, or note N/A -->
Closes #

---

## 🏷️ PR Type

- [ ] `type:bug` — Bug fix
- [ ] `type:feature` — New feature
- [ ] `type:docs` — Documentation only
- [ ] `type:refactor` — Code refactoring (no behavior change)
- [ ] `type:chore` — Maintenance, dependencies, tooling
- [ ] `type:breaking-change` — Breaking change

---

## 📝 Summary

-

## 📂 Changes

| File | Change |
|------|--------|
| `path/to/file` | What changed |

## 🧪 Test Plan

- [ ] Tests skipped because changes are documentation-only
- [ ] Lint passes locally: `npm run lint`
- [ ] Typecheck passes locally: `npm run typecheck`
- [ ] Unit tests pass locally: `npm run test:unit`
- [ ] Integration tests pass locally: `npm run test:integration`
- [ ] Manually tested the affected functionality

---

## ✅ Contributor Checklist

- [ ] Linked issue above (`Closes #N`) or marked N/A
- [ ] Added exactly one `type:*` label to this PR
- [ ] Tests pass locally or were intentionally skipped for docs-only changes
- [ ] Docs updated if behavior changed
- [ ] Commits follow conventional commits format
- [ ] No `Co-Authored-By` trailers in commits

---

## 💬 Notes for Reviewers

```

---

## After the PR is merged

Only proceed **after the user explicitly confirms** the PR is approved and CI passed:

1. Merge to develop: `gh pr merge <number> --merge`
2. Switch to develop: `git checkout develop`
3. Delete local branch: `git branch -d <branch>`
4. Delete remote branch: `git push origin --delete <branch>`
5. Pull latest: `git pull`
