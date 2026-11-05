# Pull request previews

Previews turn on when the Cloudflare token is configured (see [Setting it up](#setting-it-up)). Then every pull request into `main` gets its own copy of the site at `https://pr-<number>.<PREVIEWS_PROJECT>.pages.dev/`, built the same way as production, with the docs and command pages.
A bot comment on the pull request links it and says which commit it shows and when it expires.
Previews are public, carry a "Preview of pull request #N" banner, and tell search engines not to index them.
They have no analytics, tracking, or consent tags (Google Tag Manager, the Scarf pixel, Transcend), so preview page views never reach valkey.io's analytics.

The templates build a preview when `VALKEY_PREVIEW_PR` is set (`VALKEY_PREVIEW_COMMIT` adds the commit to the banner): they show the banner, swap `ROBOTS=ALL` for `noindex`, and leave out the analytics tags.
With it unset, the output is exactly the production site.
To build a preview locally: `VALKEY_PREVIEW_PR=123 zola serve`.
If a template adds another tracking tag, put it inside `{% if not preview_pr %}` like the others. Otherwise the deploy finds its host in the build and refuses to publish (it checks for `googletagmanager.com`, `static.scarf.sh`, and `transcend-cdn.com`, even in text).

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
| `pr-preview-build.yml` | `pull_request` | Builds the pull request with `.github/actions/build-site` in preview mode for its preview URL, and uploads the result as an artifact. No secrets, read-only token. |
| `pr-preview-deploy.yml` | the build finishing, or the label | Looks the pull request up from GitHub's data (never from the artifact), checks the fork approval, checks the artifact (no symlinks, no files Cloudflare treats as code or configuration, no tracking hosts, 1 GiB cap), adds `robots.txt` and an `X-Robots-Tag: noindex` header rule, and uploads it with `wrangler pages deploy`. Nothing in the artifact is run. |
| `pr-preview-approve.yml` | the `preview` label | Approves a fork pull request's head commit, as above. |
| `pr-preview-cleanup.yml` | a pull request closing, daily, and after each deploy | Deletes previews of closed pull requests, previews past their TTL, deployments that a newer one replaced, and fork previews of anything but the current head, and updates the comments. |

None of the workflows that hold the Cloudflare token check out or run pull request code.

## Settings

Previews are on when both of these exist, and off when either is missing:

- The `CLOUDFLARE_API_TOKEN` secret in the `pr-previews` environment. The deploy and cleanup jobs check for it and do nothing without it.
- The `PREVIEWS_PROJECT` repository variable, the Cloudflare Pages project name. The build job runs pull request code and can't see secrets, so it goes by this instead, and it gives the preview's URL. Every other job also waits for it, so nothing runs, and the environment isn't created, before setup.

`PREVIEWS_FORKS` (repository variable): `off` never publishes fork pull requests. Unset, or anything else, means they need the label.

The TTL is `TTL_DAYS` in `pr-preview-cleanup.yml`.

## Setting it up

1. Sign up for a free Cloudflare account that belongs to the project, not to one person, and use it only for previews.
2. Create an empty Pages project for direct uploads. With [Wrangler](https://developers.cloudflare.com/workers/wrangler/), logged in to that account (`npx wrangler login`):

   ```shell
   npx wrangler pages project create valkey-io-previews --production-branch main
   ```

   The dashboard can do this too (**Workers & Pages** > **Create application** > **Get started** > **Drag and drop your files**), but it publishes whatever you upload at `https://<project>.pages.dev/` right away, so upload only a placeholder page.
   Don't create a project connected to Git: Cloudflare would build pull requests itself. A Direct Upload project can never be switched to Git.
   Previews never deploy to the production branch.
3. Create the token: **Manage account** > **Account API tokens** > **Create Token**.
   Give it one permission, **Account** > **Cloudflare Pages** > **Edit**, and an expiration date, then **Continue to summary** > **Create Token**.
   An account API token can only reach this account. Cloudflare shows the token once, so copy it straight into step 5.
4. Copy the account ID: **Workers & Pages** > **Account Details** > **Account ID**.
5. In this repository, create an environment named `pr-previews` (**Settings** > **Environments** > **New environment**).
   Under **Deployment branches and tags**, choose **Selected branches and tags** and add `main`.
   Add the environment secrets `CLOUDFLARE_API_TOKEN` (the token) and `CLOUDFLARE_ACCOUNT_ID` (the account ID).
6. Create the `preview` label.
7. Add the repository variable `PREVIEWS_PROJECT` (**Settings** > **Secrets and variables** > **Actions** > **Variables** > **New repository variable**) set to the project name, and `PREVIEWS_FORKS=off` if fork previews should be off.
   `PREVIEWS_PROJECT` has to be a repository variable, not an environment one, because the build job doesn't use the environment.
   This turns previews on.
8. Check it with a test pull request from a branch in this repository:
   - The comment appears, and the preview loads.
   - `curl -sI https://pr-<number>.<project>.pages.dev/` shows `x-robots-tag: noindex`.
   - After closing the pull request, the preview URL no longer serves the site.

   Then open one from a fork. Check that the build ran (repository variables reach fork builds) and the comment asks for a maintainer.
   Have the fork's own workflows set a `pr-preview/approval-<number>` status on its head commit, and check that the comment still asks for a maintainer. Then add the label.

## Turning it off

Without the token, the cleanup stops too, so take the previews down first:

1. Delete the Pages project in Cloudflare, which deletes every preview with it.
2. Delete the API token in Cloudflare.
3. Delete the `CLOUDFLARE_API_TOKEN` secret and the `PREVIEWS_PROJECT` variable. The deploy and cleanup stop without the first, and the build stops without the second.

To take down one bad preview right away, delete its deployments in Cloudflare.
