# Pull request previews

When previews are on, every pull request into `main` gets its own copy of the site at `https://pr-<number>.<PREVIEWS_PROJECT>.pages.dev/`, built the same way as production, with the docs and command pages.
A bot comment on the pull request links it and says which commit it shows and when it expires.
Previews are public, carry a "Preview of pull request #N" banner, and tell search engines not to index them.
They have no analytics, tracking, or consent tags (Google Tag Manager, the Scarf pixel, Transcend), so preview page views never reach valkey.io's analytics.
If a page still mentions one of those hosts afterwards, even in text, the preview build fails rather than publish it; teach `build/mark-preview.py` the new form.

A new commit replaces the preview once it builds; if its build fails, the old preview is deleted.
A preview is also deleted when the pull request closes, and 7 days after its last deploy (the sweep runs daily at 05:30 UTC).
To publish an expired preview again, push a commit or add the `preview` label (builds are kept 30 days; after that, re-run the build).

## Pull requests from forks

A fork's preview is published only after a maintainer with write access adds the `preview` label, once the head commit has a finished build.
The label approves the builds of the head commit that have finished at that moment, records that as a `pr-preview/approval-<number>` commit status on it, and is taken off again, so a new commit, or a rebuild of the same one, needs the label again.
Until then, the comment says the preview is waiting for a maintainer, and any earlier preview is deleted.

Before adding the label, check that the head commit is the one you reviewed (the comment names it), and review what runs or is fetched during the build: `.github/`, `build/`, templates, and `config.toml`. The build's output is what gets published.

With `PREVIEWS_FORKS=off`, fork previews already up stay until they expire or are deleted in Cloudflare.

## How it works

| Workflow | Runs on | Does |
|---|---|---|
| `pr-preview-build.yml` | `pull_request` | Builds the pull request with `.github/actions/build-site` for its preview URL, adds the banner and noindex tag and removes the analytics tags (`build/mark-preview.py`), and uploads the result as an artifact. No secrets, read-only token. |
| `pr-preview-deploy.yml` | the build finishing, or the label | Looks the pull request up from GitHub's data (never from the artifact), checks the fork approval, checks the artifact (no symlinks, no files Cloudflare treats as code or configuration, 1 GiB cap), adds `robots.txt` and an `X-Robots-Tag: noindex` header rule, and uploads it with `wrangler pages deploy`. Nothing in the artifact is run. |
| `pr-preview-approve.yml` | the `preview` label | Approves a fork pull request's head commit, as above. |
| `pr-preview-cleanup.yml` | a pull request closing, daily, and after each deploy | Deletes previews of closed pull requests, previews past their TTL, deployments that a newer one replaced, and fork previews of anything but the current head, and updates the comments. |

None of the workflows that hold the Cloudflare token check out or run pull request code.

## Settings

Repository variables (Settings > Secrets and variables > Actions > Variables):

- `PREVIEWS_ENABLED`: `true` turns everything on. Anything else, or unset, turns it all off.
- `PREVIEWS_PROJECT`: the Cloudflare Pages project name.
- `PREVIEWS_FORKS`: `off` never publishes fork pull requests. Unset, or anything else, means they need the label.

The TTL is `TTL_DAYS` in `pr-preview-cleanup.yml`.

## Setting it up

1. Create a Cloudflare account for previews only, owned by the project rather than one person. The free plan is enough.
2. Create a Pages project for direct uploads, e.g. `npx wrangler pages project create valkey-io-previews --production-branch main`.
   Previews never deploy to the production branch, so `https://valkey-io-previews.pages.dev/` stays empty.
3. Create an account API token with only the permission **Account > Cloudflare Pages > Edit**, for this account only, with an expiry date.
   Note the account ID.
4. In this repository, create the `preview` label.
5. Create an environment named `pr-previews` (Settings > Environments). Under **Deployment branches and tags**, choose **Selected branches and tags** and add `main`.
   Add the environment secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.
6. Set `PREVIEWS_PROJECT`, and `PREVIEWS_FORKS` if fork previews should be off. Set `PREVIEWS_ENABLED` to `true` last.
7. Check it with a test pull request from a branch in this repository:
   - The comment appears, and the preview loads.
   - `curl -sI https://pr-<number>.<project>.pages.dev/` shows `x-robots-tag: noindex`.
   - After closing the pull request, the preview URL no longer serves the site.

   Then open one from a fork. Check that the build ran (repository variables reach fork builds) and the comment asks for a maintainer.
   Have the fork's own workflows set a `pr-preview/approval-<number>` status on its head commit, and check that the comment still asks for a maintainer. Then add the label.

## Turning it off

Set `PREVIEWS_ENABLED` to `false`. That stops builds, deploys, and the cleanup, so previews that are already up stay up until they're deleted in Cloudflare: delete their deployments under the Pages project, or delete the project.
To take down one bad preview right away, delete its deployments in Cloudflare.
To cut off the workflows' access, delete the API token in Cloudflare.
