+++
title = "Making patching faster: Valkey security in 2026"
description = "Valkey published more security advisories in eight months of 2026 than in its first twenty-one. AI lowered the bar to reporting bugs, but this blog will dive into how the Valkey community is keeping the bar high."
date = 2026-09-02
authors = ["madolson", "murphyjacob4", "hpatro"]

[taxonomies]
blog_type = ["Technical Deep Dive"]

[extra]
featured = false
featured_image = "/assets/media/featured/random-07.webp"
+++

We published five security advisories in Valkey's first twenty-one months, from the March 2024 fork through the end of 2025.
We published seven in the first eight months of 2026, and shipped almost three dozen security-relevant fixes.
In one two-week stretch, three researchers who did not know about each other reported the same bug, a simple use-after-free in the script debugger, an uncommonly used feature in Valkey.

Many large open source projects are seeing this.
New AI models can search large codebases for vulnerabilities cheaply.
Jeremy Stanley of OpenStack's vulnerability management team calls it a ["seemingly unending deluge of reports from researchers using LLMs to mine for security gold"](https://www.openwall.com/lists/oss-security/2026/04/28/15), and kernel, Red Hat, and HAProxy maintainers [report the same duplicates](https://lwn.net/Articles/1070698/).

The Valkey project relies on a handful of maintainers to reproduce each report, judge severity, write the fix, coordinate the embargo, and ship it across every supported version.
Three changes let us keep up: what we count as a vulnerability, how we look for bugs ourselves, and how we ship the fixes.

## Updating what counts as a vulnerability

The Valkey project publishes an advisory and assigns a Common Vulnerabilities and Exposures (CVE) identifier when a bug is discovered that allows an attacker to access something beyond their intended permission.
These CVEs let organizations track which vulnerabilities they need to patch.
Historically we generated a CVE for any issue that impacted the availability, confidentiality, or integrity of data in Valkey across clients.
That meant we generated CVEs for relatively minor issues, such as an authenticated user crashing the server with a malformed command, and told our users to patch.
Most of the security reports Valkey received fell into this category.
The bugs were crashes from malformed requests, either through the main client port or through Valkey's clustering port.
Excluding these minor issues from the CVE process recovered maintainer time for the issues that change a user's exposure.
This applies going forward; nothing already published is rescored.

Some examples of how this updated policy works in practice:

- A malformed request that crashes the server before authentication gets an advisory. [CVE-2026-27623](https://github.com/valkey-io/valkey/security/advisories/GHSA-93p9-5vc7-8wgr) is this year's example.
- An out-of-bounds read reachable by an authenticated client gets an advisory. The bytes it returns may belong to another client's keys or session, which ACLs were supposed to keep from it.
- Memory corruption with a credible path to code execution, or any action beyond granted permissions, gets an advisory.
- A crash or hang triggered by a client that already holds `EVAL` does not. That client can already write a Lua loop that pins a core indefinitely, so a bug that hangs the server doesn't give it anything it couldn't already do.

## Using adversarial testing to find bugs

With TLS enabled, Valkey may decrypt more data from the TLS stream than a single command. Valkey keeps a list of connections holding unread data and walks it once per event loop pass.
Walking means holding a pointer to the next connection while processing the current one, and processing a connection runs whatever command it sent.
If that command is `CLIENT KILL` aimed at the next connection on the list, the server frees it immediately, and the saved pointer now points at freed memory.
The next step follows that pointer and the server crashes.
Because the freed memory holds a connection object the server calls through, an attacker who can place their own bytes there has a credible path to running code in the server process, which is why this one got an advisory under the rule above.
We disclosed it as [CVE-2026-56684](https://github.com/valkey-io/valkey/security/advisories/GHSA-53mc-f3m3-99vh).

We found this one ourselves, using the same methods security researchers are adopting, on our own schedule rather than in response to a disclosure.
A model reads a subsystem and proposes candidate bugs, a second model argues against each one from the same source, and a candidate only reaches a person once it comes with a test that crashes a fresh build.
Across Valkey and the JSON, search, and bloom modules, that pipeline has so far produced 34 real bugs.
Candidates die at the verification stage when the code already handled the case the first model misread, or when the impact is too minor to act on.
We run this adversarial testing periodically across several frontier models, and we're hopeful we can use it during review, before code reaches a GA version.

## Automating the backport

The TLS bug above affected every version of Valkey, and a year ago a maintainer would have manually cherry-picked that change to each supported version.
Over the last few months engineers on the project have invested heavily in automating our release process, using AI to generate backport pull requests and resolve conflicts.
So if we wake up one morning to a zero-day in Valkey, we can get fixes out the door quickly.
Agents drive all of this, but a human is responsible for making sure the merges are correct.

## What you should do next

Move to the current patch release of every open source project you run, Valkey included, and build a mechanism that consumes new versions without a human deciding each time.
Follow the [deployment hardening guide](https://valkey.io/blog/properly-secure-your-valkey-deployment/), to make sure you're following all of the Valkey security best practices.

Report suspected vulnerabilities to security@lists.valkey.io rather than opening an issue, and bring a reproducer that runs against the build you are targeting.
A fix or a suggested fix helps, but should not delay the report.

Bugs got cheaper to find.
We're using the same tools to make them cheaper to fix, and keeping the judgment about which ones matter with people.
