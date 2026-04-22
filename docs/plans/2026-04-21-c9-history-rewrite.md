# C9 — Git History Rewrite Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove literal dev credentials (at minimum `` plus anything Task 2 inventory turns up) from all historical commits in the conest repository, then force-push the cleaned history to both `origin` (private `c50550919/CoNest`) and `portfolio` (public `c50550919/conest-portfolio`).

**Architecture:** Use `git filter-repo --replace-text` against a fresh mirror clone of the canonical remote. Build a replacements inventory from a full-history grep, rewrite, verify with another full-history grep, then force-push and re-clone the local working directory from the rewritten remote.

**Tech Stack:** git, git-filter-repo (install via `brew install git-filter-repo`), gh CLI for secret-scanning alert verification.

---

## Pre-flight Context

- **Repo path:** `/Users/ghostmac/Development/conest`
- **Current branch:** `security/audit-response-2026-04-21` (14 commits, clean tree, pushed to `origin` only)
- **Known secret literals (Task 2 inventory may find more):**
  - `` — dev DB password that appeared in docker-compose.yml, tests, scripts, and docs before the C1–C8.3 remediation
- **Remotes:**
  - `origin` → `https://github.com/c50550919/CoNest.git` (private — canonical)
  - `portfolio` → `https://github.com/c50550919/conest-portfolio.git` (public — **not yet carrying** the security branch)
- **Solo project, no collaborators.** No one else has clones to invalidate.
- **No live CoNest/Placd systems depend on the repo** (user-confirmed).
- **filter-repo rewrites SHAs for every commit touching affected files.** All branches get new SHAs. Memory/notes referencing old SHAs become stale.

---

### Task 1: Pre-flight verification

**Files:** none

**Step 1: Confirm git-filter-repo is installed**

Run:
```bash
git filter-repo --version
```
Expected: version string (e.g., `git filter-repo 2.47.0`).
If "command not found": `brew install git-filter-repo` then retry.

**Step 1b: Capability check — `--sensitive-data-removal` flag**

Clarification on what this flag is: `--sensitive-data-removal` was added in `git filter-repo` 2.47 and is **path-based** (nuke whole files/dirs from history). It is **not** a replacement for `--replace-text`, which is the right tool for literal value substitution — which is what we're doing here. So this check is purely informational; we stick with `--replace-text` either way.

Run:
```bash
git filter-repo --version
git filter-repo --help 2>&1 | grep -q 'sensitive-data-removal' \
  && echo "INFO: supports --sensitive-data-removal (not used — path-based, wrong tool for literal scrub)" \
  || echo "INFO: no --sensitive-data-removal flag; --replace-text is what we need anyway"
```
Expected: version string + one of the two INFO lines. Either outcome is fine — Task 4 uses `--replace-text` regardless.

**Step 2: Confirm working tree clean and on security branch**

Run:
```bash
cd /Users/ghostmac/Development/conest && git status && git rev-parse --abbrev-ref HEAD
```
Expected: `nothing to commit, working tree clean` and `security/audit-response-2026-04-21`.

**Step 3: Confirm the 14 security commits are on origin**

Run:
```bash
git log --oneline origin/security/audit-response-2026-04-21 | head -14
```
Expected: list starting with `48f8b4d chore(docs): finish scrubbing...` back to `1481444 security: remove hardcoded credentials...`.

**Step 4: Snapshot current ref SHAs for rollback reference**

Run:
```bash
git for-each-ref --format='%(refname) %(objectname)' refs/heads refs/remotes > /tmp/c9-pre-rewrite-refs.txt && wc -l /tmp/c9-pre-rewrite-refs.txt
```
Expected: non-empty file, one line per ref.

---

### Task 2: Build the secrets inventory

**Files:**
- Create: `/tmp/c9-replacements.txt` (filter-repo replacements file)

**Step 1: Search full history for the known main literal**

Run:
```bash
cd /Users/ghostmac/Development/conest && git log --all -p -S '' --oneline 2>&1 | head -80
```
Expected: list of commits that introduced or touched the literal. Note the count — rewrite success will be verified against this.

**Step 2: Search for other suspicious credential patterns**

Run:
```bash
git log --all -p 2>/dev/null | grep -E '(password|secret|api[_-]?key|token|pwd)\s*[:=]\s*["'"'"'][^"'"'"' ]{8,}' | sort -u | head -40
```
Expected: candidate lines. Manually review. Add any literal credential to the replacements list (skip obvious placeholders like `YOUR_PASSWORD_HERE`, `REDACTED`, `xxx`, template examples).

**Step 3: Search for project-name + dev-suffix patterns**

Run:
```bash
git log --all -p 2>/dev/null | grep -iE '(safenest|conest|placd)[_-](dev|prod|test|staging)[_-](pw|password|secret|2024|2025)' | sort -u | head -40
```
Expected: candidate lines. Add any literal hit to replacements.

**Step 4: Write the replacements file**

Write `/tmp/c9-replacements.txt` with one `literal==>replacement` per line. **Empty right-hand side deletes the literal entirely** (no "redacted" marker left in diffs — cleaner, and avoids any ambiguity about what the placeholder means):

```
==>
```

Note: if you prefer a visible scrub marker (signals to any forensic reader that something was removed here), use `==>REDACTED_DEV_PASSWORD` instead. Task 4/5 verification commands assume the empty-replacement form; adjust if you use a marker.

Run:
```bash
cat /tmp/c9-replacements.txt
```
Expected: the replacement(s), one per line, no trailing whitespace.

**Step 5: Gate — if Steps 2–3 surfaced additional literals**

Before proceeding to Task 3, list each additional literal to the user and get explicit confirmation they should be added to the replacements file. Do not assume — surprising hits may be intentional test fixtures.

---

### Task 3: Create a fresh mirror clone

**Why a mirror clone?** `git filter-repo` refuses to run on a non-fresh clone by default. A mirror clone includes all refs (branches, tags) and is the recommended working copy for history rewrites.

**Why clone from `origin` not local?** The remote is canonical. Local may have stale or divergent branches. Mirror from remote + fetch portfolio refs = complete picture.

**Files:**
- Create: `/tmp/conest-rewrite.git/` (bare mirror)
- Create: `/tmp/conest-pre-c9-backup.tgz` (tarball backup)

**Step 1: Remove any prior rewrite workspace**

Run:
```bash
rm -rf /tmp/conest-rewrite.git /tmp/conest-pre-c9-backup.tgz
```

**Step 2: Mirror-clone from origin**

Run:
```bash
git clone --mirror https://github.com/c50550919/CoNest.git /tmp/conest-rewrite.git
```
Expected: `Cloning into bare repository '/tmp/conest-rewrite.git'... done.`

**Step 3: Fetch portfolio refs into the mirror**

Run:
```bash
cd /tmp/conest-rewrite.git && git remote add portfolio https://github.com/c50550919/conest-portfolio.git && git fetch portfolio 'refs/heads/*:refs/portfolio/*'
```
Expected: portfolio branches fetched into `refs/portfolio/*` namespace. This ensures any portfolio-only commits get rewritten too.

**Step 4: Verify branches present**

Run:
```bash
git branch -a | head -30 && echo "---" && git for-each-ref refs/portfolio | head -10
```
Expected: security branch + all origin branches visible, portfolio refs under `refs/portfolio/*`.

**Step 5: Take pre-rewrite backup tarball**

Run:
```bash
tar czf /tmp/conest-pre-c9-backup.tgz -C /tmp conest-rewrite.git && ls -lh /tmp/conest-pre-c9-backup.tgz
```
Expected: tarball written. **Keep this until C9 is fully verified** — it's the rollback escape hatch.

---

### Task 4: Run filter-repo

**Files:** operates on `/tmp/conest-rewrite.git` in place

**Step 1: Record pre-rewrite HEAD SHAs for each key branch**

Run:
```bash
cd /tmp/conest-rewrite.git && git rev-parse security/audit-response-2026-04-21 portfolio-main 2>/dev/null || git rev-parse security/audit-response-2026-04-21
git for-each-ref --format='%(refname) %(objectname)' refs/heads refs/portfolio > /tmp/c9-pre-filter-shas.txt
cat /tmp/c9-pre-filter-shas.txt
```
Expected: SHAs saved for post-rewrite diff.

**Step 2: Execute the replacement**

```bash
git filter-repo --replace-text /tmp/c9-replacements.txt --force
```
Expected: progress output. Completes with something like `New history written in X seconds; now repacking/cleaning...`

**Note:** filter-repo automatically drops the `origin` remote after a rewrite (safety feature) — this is expected.

**Step 3: Confirm literals are gone from history (two-layer check)**

`-S` only flags commits where the count of matching lines changed — a pure edit that keeps the line count stable wouldn't register. So we also do a direct grep across all blobs:

```bash
# Layer 1: pickaxe (changes in literal count)
git log --all -p -S '' --oneline | head -5

# Layer 2: direct grep across full patch output (catches in-line edits)
git log --all -p 2>/dev/null | grep '' | head -5

# Layer 3: scan every tracked blob at current tips
git grep -I '' $(git rev-list --all) 2>/dev/null | head -5
```
Expected: **all three empty.** If anything shows up, the replacement missed a variant — stop and investigate before pushing.

**Step 4: (Optional, if using marker replacement)**

Only applicable if you used `==>REDACTED_DEV_PASSWORD` in the replacements file instead of empty right-hand side:
```bash
git log --all -p -S 'REDACTED_DEV_PASSWORD' --oneline | head -5
```
Expected: at least one commit showing the replacement token. Skip this step entirely if using empty-replacement form.

**Step 5: Confirm branch structure preserved and SHAs changed**

Run:
```bash
git branch -a | head -30 && git log --oneline security/audit-response-2026-04-21 | head -14
git for-each-ref --format='%(refname) %(objectname)' refs/heads refs/portfolio > /tmp/c9-post-filter-shas.txt
diff /tmp/c9-pre-filter-shas.txt /tmp/c9-post-filter-shas.txt | head -20
```
Expected: 14 security commits still visible (new SHAs), branches intact, diff shows every ref moved.

---

### Task 5: Verify before force-push

**Files:** none

**Step 1: Re-run inventory queries against rewritten repo (three layers)**

Run each of Task 2 Steps 1–3 against `/tmp/conest-rewrite.git`, **plus** the direct grep pass from Task 4 Step 3:

```bash
cd /tmp/conest-rewrite.git

# Pickaxe
git log --all -p -S '' --oneline | head

# Direct patch grep (catches in-line edits -S would miss)
git log --all -p 2>/dev/null | grep '' | head

# Blob scan
git grep -I '' $(git rev-list --all) 2>/dev/null | head

# Generic project-name + dev-suffix sweep
git log --all -p 2>/dev/null | grep -iE '(safenest|conest|placd)[_-](dev|prod|test|staging)[_-](pw|password|secret|2024|2025)' | head
```
Expected: all four return empty. Any hit → stop, do not push.

**Step 2: Confirm tip-of-branch file contents identical**

Run:
```bash
cd /tmp/conest-rewrite.git && git show security/audit-response-2026-04-21 --stat | head -5
cd /Users/ghostmac/Development/conest && git show security/audit-response-2026-04-21 --stat | head -5
```
Expected: same files, same stat lines. Rewrite should not alter tip content — only historical blobs.

**Step 3: Spot-check a known-rewritten commit**

Pick a commit SHA from the Task 2 Step 1 output (one that touched the literal) and find its rewritten equivalent:
```bash
cd /tmp/conest-rewrite.git && git log --all --oneline | head -30
# Pick a commit that previously had the literal, show it
git show <new-sha> | grep -i 'redacted\|password' | head -5
```
Expected: literal replaced with `REDACTED_DEV_PASSWORD` in the diff.

---

### Task 6: Force-push to private origin

**Why origin first?** Lower-risk remote. Confirm push works and history looks correct on GitHub before touching public portfolio.

**Files:** none

**Step 1: Re-add origin remote to mirror (filter-repo removed it)**

Run:
```bash
cd /tmp/conest-rewrite.git && git remote add origin-real https://github.com/c50550919/CoNest.git && git remote -v
```
Expected: `origin-real` listed with fetch/push URLs.

**Step 2: Force-push all branches**

Run:
```bash
git push --mirror origin-real
```
Expected: every branch updated with `+ <old>...<new> (forced update)`. If GitHub rejects due to branch protection on `main` or `placd-pivot`, temporarily lift protection, push, then re-enable.

**Note:** `--mirror` replicates refs including deletions. Since we mirror-cloned from origin, the only deletions would be stale remote-tracking branches filter-repo cleaned up — benign.

**Step 3: Verify on GitHub**

Open `https://github.com/c50550919/CoNest/commits/security/audit-response-2026-04-21` in browser. Pick one commit that previously contained the literal and confirm the diff shows `REDACTED_DEV_PASSWORD`.

**Step 4: Check secret-scanning alerts (optional)**

Run:
```bash
gh api repos/c50550919/CoNest/secret-scanning/alerts 2>/dev/null | head -60
```
Expected: empty `[]` or only pre-existing resolved alerts. Alerts pointing at old SHAs auto-retire within ~24h.

---

### Task 7: Push cleaned history to public portfolio

**Files:** none

**Step 1: Add portfolio remote to mirror**

Run:
```bash
cd /tmp/conest-rewrite.git && git remote add portfolio-real https://github.com/c50550919/conest-portfolio.git && git remote -v
```

**Step 2: Decide which branches go public**

List mirror branches:
```bash
git branch -a
```

The public portfolio carries a curated subset. Typical public set:
- `portfolio/main` (or whatever the public default branch is named)
- `security/audit-response-2026-04-21` (new)

**Gate:** Confirm branch names with user before pushing.

**Step 3: Force-push the curated branches**

Adjust exact branch names based on Step 2. Example:
```bash
git push --force portfolio-real portfolio/main:main
git push --force portfolio-real security/audit-response-2026-04-21
```

**Step 4: Verify on GitHub**

Open `https://github.com/c50550919/conest-portfolio/commits/main` and the security branch commit list. Confirm rewritten history visible, no literal secrets in diffs.

**Step 5: Check portfolio secret-scanning alerts**

Run:
```bash
gh api repos/c50550919/conest-portfolio/secret-scanning/alerts 2>/dev/null | head -60
```

---

### Task 8: Refresh local working directory

**Why?** Local `/Users/ghostmac/Development/conest` still has pre-rewrite SHAs. Its `origin` tracking is now divergent. Easiest fix: re-clone.

**Files:**
- Move: `/Users/ghostmac/Development/conest` → `/Users/ghostmac/Development/conest.pre-c9`
- Create: fresh `/Users/ghostmac/Development/conest`

**Step 1: Move stale working copy aside**

Run:
```bash
mv /Users/ghostmac/Development/conest /Users/ghostmac/Development/conest.pre-c9
```

**Step 2: Clone rewritten repo fresh**

Run:
```bash
cd /Users/ghostmac/Development && git clone https://github.com/c50550919/CoNest.git conest && cd conest && git remote add portfolio https://github.com/c50550919/conest-portfolio.git && git fetch portfolio
```
Expected: fresh clone, both remotes configured.

**Step 3: Check out security branch and verify clean**

Run:
```bash
git checkout security/audit-response-2026-04-21 && git log --oneline | head -14 && git log -p -S '' | head
```
Expected: 14 security commits (new SHAs); final query returns empty.

**Step 4: Restore any uncommitted local work**

If `conest.pre-c9` had uncommitted changes, `cp -a` specific files over. Current session left tree clean, so this should be a no-op — verify:
```bash
cd /Users/ghostmac/Development/conest.pre-c9 && git status
```

---

### Task 9: Final verification and cleanup

**Files:** none

**Step 1: Comprehensive full-history scan (four layers)**

Run:
```bash
cd /Users/ghostmac/Development/conest

# Pickaxe
git log --all -p -S '' --oneline | head

# Direct patch grep
git log --all -p 2>/dev/null | grep '' | head

# Blob scan across all reachable objects
git grep -I '' $(git rev-list --all) 2>/dev/null | head

# Project-name + dev-suffix pattern sweep
git log --all -p 2>/dev/null | grep -iE '(safenest|conest|placd)[_-](dev|prod|test|staging)[_-](pw|password|secret|2024|2025)' | head
```
Expected: all four empty.

**Step 2: Remove stale working copy once confident**

Only after GitHub verification passed AND full scans are clean:
```bash
rm -rf /Users/ghostmac/Development/conest.pre-c9
```

**Step 3: Tarball retention**

Keep `/tmp/conest-pre-c9-backup.tgz` for at least 7 days as a rollback escape hatch. After 7 days:
```bash
rm /tmp/conest-pre-c9-backup.tgz
```

**Step 4: Recheck secret-scanning alerts after 24h**

Run (tomorrow):
```bash
gh api repos/c50550919/CoNest/secret-scanning/alerts 2>/dev/null
gh api repos/c50550919/conest-portfolio/secret-scanning/alerts 2>/dev/null
```
Expected: any alerts referencing old SHAs auto-retired.

---

## Rollback Protocol

**Before any force-push (Tasks 1–5):** `rm -rf /tmp/conest-rewrite.git`, start over.

**After origin force-push, before portfolio:**
```bash
rm -rf /tmp/conest-rewrite.git
tar xzf /tmp/conest-pre-c9-backup.tgz -C /tmp
cd /tmp/conest-rewrite.git
git remote add origin-real https://github.com/c50550919/CoNest.git
git push --mirror --force origin-real
```

**After both force-pushes:** same restore dance plus `git push --force portfolio-real <each-branch>`.

Remote force-push is fully reversible from the tarball.

---

## Out of Scope

- Rotating live credentials (none exist per user confirmation)
- Manually closing secret-scanning alerts (GitHub auto-retires them for rewritten commits)
- Rewriting history in unrelated projects (jobsearch-bot, founder-cloud-*, etc.)
- Historical author/email changes
- Public-facing announcement of the rewrite (handled separately after C9 completes)

---

## Appendix: Second history-rewrite pass — AI tooling artifact purge (2026-04-22)

After C9 completed, a separate credibility audit of the public `conest-portfolio` repo surfaced a second class of issues unrelated to the dev-credential leak: AI-assisted development artifacts (tooling configs, session completion reports, task-ID-named markdown files) committed across many historical commits. These were not security-sensitive but were reputational — the repo read as AI-generated scaffolding rather than a finished artifact.

Addressed with a second `git filter-repo --invert-paths` pass against a fresh mirror clone, same tarball-backup → three-layer-verification → force-push discipline used above.

**Severity classification — accurate labeling matters:**
- **Not a credential leak.** `LOGIN_CREDENTIALS.md` (the most-alarming-named file purged) contained seeded test users (password `Test1234`) and a local network IP — dev fixture data only, no real secrets.
- **No CVSS severity.** Everything purged was cosmetic/reputational.
- **Runbook note:** overstating this pass as a second "security incident" would misrepresent it. Frame as a credibility/polish sweep that happened to use the same tool.

**Paths purged** (full list recorded in `/tmp/scrub-paths.txt` at time of run, ~66 entries):

Prefixes:
- `.claude/` — Claude Code tooling (slash commands, custom agents, skills, settings)
- `.specify/` — GitHub Spec Kit AI workflow templates
- `docs/archive/sessions/` — explicit session-artifact archive (39 files)

Individual files:
- `.mcp.json`, `.mcp.json.fixed`, `CLAUDE.md`
- `DARABASE.SQL` (0-byte typo file next to `DATABASE.sql`)
- `LOGIN_CREDENTIALS.md` (dev fixtures, not real secrets)
- 35+ root-level AI-session report `.md` files (`*_COMPLETE.md`, `*_COMPLETION_REPORT.md`, `*_IMPLEMENTATION*.md`, `*_STATUS*.md`, `*_SUMMARY.md`, `WAVE[0-9]+_*.md`, `TASKS_T*_*.md`, `FINAL_STATUS_REPORT.md`, `SPEC_KIT_GUIDE.md`, etc.)
- `ARCHITECTURE.md` (Claude-style enumeration; the real architecture diagram lives in `README.md`)
- `backend/T057-T059_IMPLEMENTATION_SUMMARY.md`, `backend/TASKS_T054-T056_COMPLETION_REPORT.md`, and sibling session reports under `backend/`

**Explicitly protected (kept through the rewrite):**
- `README.md`, `SECURITY.md`, `LICENSE`, `BRANDING_UPDATE_SUMMARY.md` (legitimate rename audit)
- `backend/README.md` + backend technical reference docs (`API_EXAMPLES.md`, `STRIPE_WEBHOOKS.md`, `TESTING_GUIDE.md`, etc.)
- Full `docs/` tree except `docs/archive/sessions/`
- This runbook itself

**Command:**
```bash
git filter-repo --paths-from-file /tmp/scrub-paths.txt --invert-paths --force
```

**Verification:** same three-layer discipline as the dev-credential pass — filename scan, patch grep, reachable-blob scan across all refs before force-pushing to origin then portfolio.
