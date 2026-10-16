# Canonical one-core workspace

- The only development workspace for ERP, Marketplace, Estimate, Web, and Android is `C:\dev\rik-expo-app-r4a5-dc4f0ce7`.
- Run every command with that directory as its explicit working directory. Before edits and after any context compaction, verify `git rev-parse --show-toplevel` equals the canonical path.
- Do not edit or launch the product from another checkout or worktree. Preserve unique changes through the governed inventory/archive/merge process before retiring a duplicate.
- Use `scripts/dev/startWholeAppDeveloperReview.ps1` as the single whole-app launcher. Do not create a second launcher or calculation backend.
- Web/Metro, Android/Metro, auth broker, canonical estimate backend, and the selected definition/search releases must share the recorded canonical source identity. A matching process path alone is insufficient; verify the authenticated runtime manifest tuple.
- Keep production, deploy, remote activation, OTA, EAS, app-store, and `main` changes outside local developer work unless the user explicitly authorizes them.

