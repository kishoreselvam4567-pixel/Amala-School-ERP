# Git & Local Execution Rules

## 1. Local Execution First
- All commands, server runs, builds, tests, and verifications MUST run locally first.

## 2. No Automatic Git Pushes
- **NEVER** run `git push` automatically under any circumstance.
- Automatic pushing to GitHub or any remote repository is strictly disabled.

## 3. Manual Confirmation Required
- After all local changes and commands execute successfully, provide a clear success check report.
- Explicitly ask the user for manual confirmation before any push to GitHub is initiated.
