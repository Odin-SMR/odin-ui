# Visualization and Parquet access release

User-authorized data-stack task UI-RELEASE-001 commits and deploys the responsive
visualization, profile uncertainty, L1 range controls, API guidance and Parquet
discovery. The source includes the existing migration UI dependencies, whose
scientific readiness gates remain active.

The archive snapshot indexes all 52,277 Parquet objects (183,278,261,187 bytes)
returned by complete listings of the three current L2 API projects. Twenty-seven
product shards load on demand. Partition months and object ETags are labeled
honestly; row counts, scientific checksums and exact observation dates are not
inferred from listing metadata.

Two byte-identical historical examples (17,012,136 bytes total) have full SHA256,
physical schemas and row counts. Their content-addressed objects are uploaded
separately under `parquet/releases/odin-parquet-examples-20261113/files/`; no
scientific payload is committed to Git. The accompanying source receipt records
unknown original build provenance and unknown diagnostic dates. Publication
declares no additional data license.

## Validation and deployment

- Independent review reconciled every archive entry against the scoped source
  inventories and inspected both physical tutorial files.
- All three notebooks executed with real files in verified local caches; a
  failed retrieval produced no fabricated spectrum. Publication acceptance also
  requires anonymous byte/range verification.
- Full UI tests, lint/build, catalog and archive validators are release gates.
  Responsive fixture checks cover visualization flows, archive selection,
  downloads, error/retry and undated diagnostics.
- Cloud API commit `2c6a8a4` adds aligned source uncertainty arrays. Its deployed
  package preserves all prior dependencies; a bounded live comparison retained
  every old field exactly across three products.

The public `/l2/` route already serves valid objects through a private S3 origin;
no bucket policy or shared CDK deployment is needed. Earlier missing-key probes
returned the existing SPA HTML fallback, which the validators reject.

Back up previous mutable objects and `index.html` before publication; bucket
versioning is not enabled. Upload hashed assets first, static metadata next and
the new entrypoint last. Retain previous assets. Rollback restores the saved
mutable files and entrypoint, then invalidates CloudFront. Invalidation uses
`/*` so viewer-request URI rewrites and cached SPA routes are also refreshed.

No new standing infrastructure is introduced. Metadata storage, the 17 MB
example copy, S3 requests and CloudFront delivery use existing billing. Download
traffic is user-driven; the page loads index metadata only. The unfinished
PostgreSQL migration remains excluded from public scientific release.

The data-stack task stores exact deployed commit/build hashes, independent
review and public verification receipts. Local operational rollback artifacts
are under `/tmp/odin-ui-release-deploy` and `/tmp/odin-ui-release-api`.
