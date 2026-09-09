# Security status

## Payload account unlock (GHSA-jg8r-5jh2-v2xj)

As of 2026-09-09, the [reviewed upstream advisory](https://github.com/advisories/GHSA-jg8r-5jh2-v2xj) affects Payload through 3.88.0 and lists no patched release. Payload 3.88.0 is the latest stable version available on npm. Do not substitute an unpublished version or a major-version canary to silence the finding.

This repository's development `users` collection explicitly denies the unlock operation with `access.unlock: () => false`. The fixture has no privileged role model and does not need manual account unlocking. A regression test exercises Payload's real access evaluator for anonymous and authenticated requests and requires HTTP 403 for both.

The contact plugin adds no authentication collections. Applications that consume it must define restrictive `access.unlock` rules on **every** auth-enabled collection while running an affected Payload version. Deny the operation if it is unused; otherwise authorize it using the application's actual privileged role model. Merely checking whether a user is signed in does not mitigate the issue. See [Payload collection access control](https://payloadcms.com/docs/access-control/collections).

The version-based Dependabot alert and `pnpm audit` finding remain open. No advisory is dismissed or ignored in this repository. Upgrade Payload and its matching `@payloadcms/*` packages together when a stable corrected release is published, then rerun the regression test and dependency audit.

## Transitive development dependencies

`pnpm-workspace.yaml` overrides the vulnerable versions pinned by Monaco and the legacy Drizzle loader. Next.js is declared explicitly so Payload's development integration resolves a patched supported version. Keep the lockfile and these constraints together when updating dependencies.
