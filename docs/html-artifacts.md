---
status: review
type: ai-generated
---

# HTML upload contract

## Product scope and acceptance

The CLI uploads an AI-generated report, demo, or other HTML result without
converting its body to Markdown. A new result is an owner-only draft by default;
publication requires an explicit flag. Existing Markdown commands retain their
current behavior.

```bash
keyflow html push report.html --title "Report" --account NAME --dry-run --json
keyflow html push report.html --title "Report" --account NAME --json
keyflow html push report.html --title "Report" --as link --publish --account NAME --json
keyflow html list --account NAME --json
keyflow html push report.html --id ARTIFACT_ID --account NAME --json
```

Supported push flags are `--title`, `--description`, `--as post|link`,
`--language ko|en`, `--folder ID`, `--publish`, `--draft`, `--id ID`,
`--dry-run`, `--json`, and `--account NAME`. `--publish` and `--draft` are
mutually exclusive. Listing supports `--json` and `--account NAME`.

Acceptance criteria:

- Create requires a nonempty title of at most 120 characters. Description is
  optional, at most 500 characters. Post mode and draft access are the defaults.
  Draft access is private even when a linked post's future visibility is public.
- A post appears in the existing workspace library and post reader. A standalone
  link uses a full-viewport page, without a feed or profile post entry. Draft
  standalone links cannot be shared publicly.
- The input is a nonempty UTF-8 `.html` or `.htm` file, at most 1,048,576 bytes.
  CSS and JavaScript must be inline; images and fonts must use embedded data URLs.
  The CLI neither rewrites this file nor uploads adjacent assets.
- The viewer runs HTML in an isolated script-enabled sandbox. External CDN
  assets, API requests, local relative assets, browser storage, forms, and
  scripted popups are unsupported. Trusted user clicks on HTTP(S) anchors open
  a safe new tab; fragment anchors scroll within the result. This does not enable
  arbitrary network access from its scripts.
- Offline dry runs validate the local input and options without login, network
  access, source modification, or a claim that server authorization will succeed.
- An update requires the saved artifact ID. Omitted title, description, status,
  publication mode, and language preserve their current values. `--as` may repeat
  the current mode but cannot convert a post to a link or a link to a post.
  `--folder` is create-only; existing folder placement is preserved on update.
- Listing returns at most 50 metadata records without downloading HTML source.
  Linked post metadata reflects its current title, status, visibility, and slug.
  Trashed posts are omitted; missing linked posts carry an orphan marker.

Use the Web editor for covers, tags, bilingual edition linking, custom slugs,
and advanced publishing settings. There are no corresponding CLI HTML flags or
CLI HTML delete command. In the Web **My HTML results** list, deleting a linked
post moves it to Trash for restoration. Emptying Trash removes its HTML metadata
and queues source cleanup. Standalone links and orphaned results can be deleted
permanently after confirmation. Queued cleanup is not an immediate physical
storage deletion guarantee.

## Architecture and owner boundaries

The CLI owns file validation, explicit account selection, option normalization,
capability checking, version-aware API calls, and safe terminal output. Its HTML
command path is separate from Markdown parsing, frontmatter identity writeback,
image discovery, and scheduled Markdown publication.

KeyFlow Web owns authorization, artifact IDs and versions, native post metadata,
visibility enforcement, isolated rendering, raw-source storage, and cleanup.
Credentials stay on the existing device-auth path. The CLI sends authenticated
requests only to the selected account's bound origin and does not follow
redirects. An unknown account or mismatched identity must fail rather than use
another account.

Raw HTML is stored by the server in private R2 objects; Firestore stores metadata
and the source pointer. Neither terminal results nor owner lists expose that
pointer. Existing server limits and writer permissions apply. This feature uses
the existing authenticated endpoints and storage; it introduces no model call,
asset crawler, paid service, recurring worker, or client polling loop.

## API and update sequence

1. Validate file size, UTF-8 content, and local options. A dry run stops here.
2. Resolve the intended account and obtain credentials through the existing
   authenticated session. Require `capabilities.htmlArtifacts === true` from
   `GET /api/cli/config` before any HTML upload. Missing capability, an old
   server, or a failed configuration request stops the operation.
3. For an update, fetch `GET /api/cli/html?artifactId=ID` under the selected
   owner's credentials. Reject an invalid or mismatched response. Combine
   explicitly supplied changes with current metadata; retain the returned
   version as `expectedVersion`.
4. Send `POST /api/cli/html` with `title`, `description`, `html`, and `status`
   (`draft` or `published`), plus optional `publication`, `language`, and the
   create-only `folderId`. Updates also send `artifactId` and `expectedVersion`.
   The CLI does not use the Web editor's `editorManaged`, `nativePostId`, or
   `translationOf` fields.
5. Validate the successful artifact response and return its ID, version, state,
   and URL resolved against the bound server. Keep credentials, source HTML,
   storage keys, and raw server diagnostics out of stdout and error output.

`GET /api/cli/html` lists the selected owner's artifacts. GET and POST require
Bearer authentication and return private, non-cacheable responses. A `409`
version conflict is terminal for that command: no automatic retry, rebase, or
overwrite. Reload and review the current result before an intentional retry.
An interrupted or ambiguous create must be reconciled with the owner list
before repeating it, because it may already have saved a new artifact.

## Verification and release recovery

From the CLI repository, run:

```bash
npm test
npm run build
node dist/index.js html --help
node dist/index.js html push --help
node dist/index.js html push report.html --title "Report" --dry-run --json
npm pack --dry-run
git diff --check
```

Use fixture credentials and mocked HTTP to verify draft defaults, both publication
modes, account isolation, missing capability, malformed responses, current-version
updates, omitted metadata preservation, conflicting updates, and safe output.
Check the 1 MiB boundary, invalid UTF-8, unsupported extensions, invalid flags,
and source byte preservation. A dry run must succeed without a local session
and must make no HTTP request. Existing Markdown tests must still pass.

Before publication, verify the exact package revision, immutable npm version,
packed files, and Web capability deployment. After publication, verify registry
readback and the installed command's help and offline dry run. Any real upload
smoke needs an explicitly selected account and approved fixture content; local
checks alone do not prove a production upload.

Deploy the compatible Web API before distributing the CLI. An older Web server
causes HTML commands to fail closed; existing Markdown remains available. To
recover from a CLI regression, install a previously verified package version or
publish a corrected new version. Never overwrite an existing npm version or
delete user artifacts as part of rollback. Web rollback must preserve artifact
metadata and private source objects; restore a compatible build before resuming
HTML writes.
