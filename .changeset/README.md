# Changesets

Every PR that changes a published package adds a changeset (CLAUDE.md "Done means" #6):

```sh
pnpm changeset
```

All `@kyralabs/*` packages share one version (`fixed` in `config.json`). On `main`, the Release
workflow opens a "chore: version packages" PR from pending changesets; merging it publishes to npm.
`@kyralabs/m3e-codegen`, `apps/docs`, `apps/site` and `apps/visual` are private and never published;
a PR that only changes them adds no changeset.
