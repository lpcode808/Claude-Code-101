## Session Notes (Claude-Code-101)

Summary of recent work so it is preserved inside the renamed directory.

Changes
- Swapped typography to Sora (headings) and Source Serif 4 (body).
- Self-hosted fonts to avoid Google Fonts loading issues.
- Added `fonts/` with woff2 files and `fonts/fonts.css`.
- Updated `claude-code-guide.html` to load local fonts.
- Created `index.html` (copy of `claude-code-guide.html`) for GitHub Pages.
- Added `README.md` and `.gitignore`.
- Renamed project directory from `Learning` to `Claude-Code-101`.
- Updated path references in `DEVELOPMENT-SUMMARY.md`.
- Initialized git repo, added remote `https://github.com/<github-username>/Claude-Code-101`.
- Fixed push/auth issues by switching from HTTPS + PAT to SSH.

Git status
- Local/remote were diverged (local ahead 1, remote ahead 4).
- HTTPS pushes repeatedly failed with "remote end hung up unexpectedly".
- Resolved by switching to SSH; `origin` should be `git@github.com:<github-username>/Claude-Code-101.git`.

Notes
- `index.html` is the GitHub Pages entry point.
- Fonts are served locally from `fonts/`.
- SSH setup steps used:
  - `ssh-keygen -t ed25519 -C "your_email@example.com"`
  - `eval "$(ssh-agent -s)"` then `ssh-add ~/.ssh/id_ed25519`
  - `pbcopy < ~/.ssh/id_ed25519.pub` and add key in GitHub
  - `git remote set-url origin git@github.com:<github-username>/Claude-Code-101.git`
  - `git push --force-with-lease -u origin main`
- If a PAT is ever leaked, revoke it immediately in GitHub settings.
