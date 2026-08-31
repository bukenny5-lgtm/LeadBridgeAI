# Submission Checklist

## Repository state

- [ ] `git status` is clean.
- [ ] The Phase 5 commit is still present in history.
- [ ] No unrelated worktree changes were introduced.

## Build and test

- [ ] `npm.cmd run typecheck`
- [ ] `npm.cmd test`
- [ ] `npm.cmd run check`
- [ ] `npm.cmd run build:web`

## Trace and content review

- [ ] Coding-agent traces are included.
- [ ] Runtime-agent traces are included.
- [ ] Trace files are sanitized.
- [ ] No secrets, credentials, or personal data appear in the submission package.

## ZIP validation

- [ ] ZIP is created from an explicit allowlist.
- [ ] `.git` is excluded.
- [ ] `node_modules` is excluded.
- [ ] `dist` is excluded.
- [ ] The ZIP contains source, docs, data, prompts, tests, evaluation cases/results, and traces.
- [ ] The ZIP can be extracted safely and inspected.

## Demo and video

- [ ] Public video URL is available.
- [ ] Video permissions allow judges to view it.
- [ ] The demo walkthrough matches the recorded script.
- [ ] The browser text is readable at the chosen resolution.

## HackerEarth upload

- [ ] Required fields are filled in.
- [ ] Repository link is correct.
- [ ] Video link is correct.
- [ ] Submission artifact hash was checked.
- [ ] Final upload was verified.
- [ ] The deadline has not passed.
