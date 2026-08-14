# Disabled GitHub Workflows

The files under `legacy-auto-dev-2026-08-14/` are preserved history from the
former Auto-Dev Codex/Claude review loop. They are outside
`.github/workflows/`, so GitHub Actions does not discover or execute them.

`legacy-auto-dev-2026-08-14/production-selftest.yml` preserves the former
push-triggered production check byte-for-byte. The active production self-test
is manual and requires explicit confirmation.

Do not move these files back into the active workflow directory without an
explicit decision to restore that automation.
