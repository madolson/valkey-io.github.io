# Pull request previews

Previews turn on once the AWS side is set up (see [Setting it up](#setting-it-up)). Then every pull request into `main` gets its own copy of the site at `https://<PREVIEWS_HOST>/pr-<number>/`, built the same way as production, with the docs and command pages.
A bot comment on the pull request links it and says which commit it shows and when it expires.
Previews are public, carry a "Preview of pull request #N" banner, and tell search engines not to index them.
They have no analytics, tracking, or consent tags (Google Tag Manager, the Scarf pixel, Transcend), so preview page views never reach valkey.io's analytics.

The templates build a preview when `VALKEY_PREVIEW_PR` is set (`VALKEY_PREVIEW_COMMIT` adds the commit to the banner): they show the banner, swap `ROBOTS=ALL` for `noindex`, and leave out the analytics tags.
With it unset, the output is exactly the production site.
To build a preview locally: `VALKEY_PREVIEW_PR=123 zola serve`.
If a template adds another tracking tag, put it inside `{% if not preview_pr %}` like the others. Otherwise the deploy finds its host in the build and refuses to publish (it checks for `googletagmanager.com`, `static.scarf.sh`, and `transcend-cdn.com`, even in text).

A new commit replaces the preview once it builds; if its build fails, the old preview is deleted.
A preview is also deleted when the pull request closes, and 14 days after its last deploy (the sweep runs daily at 05:30 UTC). S3 itself deletes preview files 15 days after upload, so previews expire even if the workflows stop.
To publish an expired preview again, push a commit or add the `preview` label (builds are kept 30 days; after that, re-run the build).

## Pull requests from forks

A fork's preview is published only after a maintainer with write access adds the `preview` label, once the head commit has a finished build.
The label approves the builds of the head commit that have finished at that moment, records that as a `pr-preview/approval-<number>` commit status on it, and is taken off again, so a new commit, or a rebuild of the same one, needs the label again.
Until then, the comment says the preview is waiting for a maintainer, and any earlier preview is deleted.

Before adding the label, check that the head commit is the one you reviewed (the comment names it), and review what runs or is fetched during the build: `.github/`, `build/`, templates, and `config.toml`. The build's output is what gets published.

With `PREVIEWS_FORKS=off`, fork previews already up stay until they expire.

## How it works

Previews live in a private S3 bucket, one `pr-<number>/` prefix per pull request, served only through CloudFront ([`infra/pr-previews.yml`](../infra/pr-previews.yml)).
CloudFront serves them at its own `*.cloudfront.net` hostname, so there's no domain or certificate to manage. A CloudFront Function serves `index.html` for directories under `/pr-<number>/`, 404s every other path, and answers `/robots.txt` with `Disallow: /`; CloudFront adds `X-Robots-Tag: noindex, nofollow` to every response.
The site works under `/pr-<number>/` because the templates put the base URL's path in front of root-relative links (`templates/macros/links.html`).
All previews share that one hostname, so a preview's scripts can reach the others' pages and storage in the same browser. That's why fork previews need a maintainer first.
The workflows reach AWS through GitHub's OIDC, so no AWS key is stored anywhere. The role they assume can only write and delete `pr-*` keys in that bucket.

| Workflow | Runs on | Does |
|---|---|---|
| `pr-preview-build.yml` | `pull_request` | Builds the pull request with `.github/actions/build-site` in preview mode for its preview URL, and uploads the result as an artifact. No secrets, read-only token. |
| `pr-preview-deploy.yml` | the build finishing, or the label | Looks the pull request up from GitHub's data (never from the artifact), checks the fork approval, checks the artifact (no symlinks or special files, no tracking hosts, 1 GiB cap), adds `robots.txt`, and syncs it to `pr-<number>/` with the AWS CLI. Nothing in the artifact is run. |
| `pr-preview-approve.yml` | the `preview` label | Approves a fork pull request's head commit, as above. |
| `pr-preview-cleanup.yml` | a pull request closing, daily, and after each deploy | Deletes previews of closed pull requests, previews past their TTL, and fork previews of anything but the current head, and updates the comments. |

Only the jobs that publish or delete can assume the role, and none of them check out or run pull request code.

## Settings

Previews are on when both of these exist, and off when either is missing:

- The `AWS_ROLE_ARN` secret in the `pr-previews` environment. The deploy and cleanup jobs check for it and do nothing without it.
- The `PREVIEWS_HOST` repository variable, the CloudFront hostname. The build job runs pull request code and can't see secrets, so it goes by this instead, and it gives the preview's URL. Every other job also waits for it, so nothing runs, and the environment isn't created, before setup.

They also need the `PREVIEWS_BUCKET` variable in the `pr-previews` environment.

`PREVIEWS_FORKS` (repository variable): `off` never publishes fork pull requests. Unset, or anything else, means they need the label.

The TTL is `TTL_DAYS` in `pr-preview-cleanup.yml`, and S3's backstop is `ExpireDays` in `infra/pr-previews.yml`.

## Setting it up

This needs someone who administers the project's AWS account.

1. Deploy `infra/pr-previews.yml` as a CloudFormation stack in **us-east-1**, where the workflows expect the bucket:

   ```shell
   aws cloudformation deploy --region us-east-1 --stack-name valkey-pr-previews \
     --template-file infra/pr-previews.yml --capabilities CAPABILITY_IAM \
     --parameter-overrides \
       GitHubOidcProviderArn=arn:aws:iam::<account>:oidc-provider/token.actions.githubusercontent.com
   ```

   An account has only one GitHub OIDC provider. If the account already publishes releases from GitHub Actions, it has one: pass its ARN (**IAM** > **Identity providers**). Leave `GitHubOidcProviderArn` out only if there's none, and the stack creates it.
2. In this repository, create an environment named `pr-previews` (**Settings** > **Environments** > **New environment**).
   Under **Deployment branches and tags**, choose **Selected branches and tags** and add `main`. The role trusts only jobs in this environment, so this is what keeps it to `main`.
   Add the environment secret `AWS_ROLE_ARN` (the stack's `RoleArn` output) and the environment variable `PREVIEWS_BUCKET` (its `BucketName` output).
3. Create the `preview` label.
4. Add the repository variable `PREVIEWS_HOST` (**Settings** > **Secrets and variables** > **Actions** > **Variables** > **New repository variable**) set to the stack's `PreviewsHost` output (`d<id>.cloudfront.net`), and `PREVIEWS_FORKS=off` if fork previews should be off.
   `PREVIEWS_HOST` has to be a repository variable, not an environment one, because the build job doesn't use the environment.
   This turns previews on.
5. Check it with a test pull request from a branch in this repository:
   - The comment appears, and the preview loads.
   - `curl -sI https://<host>/pr-<number>/` shows `x-robots-tag: noindex, nofollow`, and `https://<host>/robots.txt` is `Disallow: /`.
   - `curl -sI https://<bucket>.s3.amazonaws.com/pr-<number>/index.html` is refused (403): the bucket isn't public.
   - After closing the pull request, the preview URL no longer serves the site.

   Then open one from a fork. Check that the build ran (repository variables reach fork builds) and the comment asks for a maintainer.
   Have the fork's own workflows set a `pr-preview/approval-<number>` status on its head commit, and check that the comment still asks for a maintainer. Then add the label.

If assuming the role fails with `Not authorized to perform sts:AssumeRoleWithWebIdentity`, compare the subject in CloudTrail's `AssumeRoleWithWebIdentity` event with the two the role trusts. This repository's OIDC tokens use the name-based subject (`repo:valkey-io/valkey-io.github.io:environment:pr-previews`) today, and the role also trusts the immutable one (`repo:valkey-io@164458127/valkey-io.github.io@777882230:environment:pr-previews`).

## Turning it off

Delete the `AWS_ROLE_ARN` secret and the `PREVIEWS_HOST` variable. The deploy and cleanup stop without the first, and the build stops without the second.
Previews already up are deleted by S3 within 15 days. To delete them now, empty the bucket's `pr-` prefixes, or delete the stack after emptying the bucket.

To take down one bad preview right away: `aws s3 rm s3://<bucket>/pr-<number>/ --recursive`. CloudFront caches nothing, so it's gone at once.
