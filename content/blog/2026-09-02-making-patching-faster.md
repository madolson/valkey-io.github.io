+++
title = "Bugs got cheaper to find: Valkey security in 2026"
description = "Valkey published more security advisories in the first eight months of 2026 than in its first twenty-one. AI made bugs cheaper to find. This post covers how the Valkey community is keeping up."
date = 2026-09-02
authors = ["madolson", "murphyjacob4", "hpatro"]

[taxonomies]
blog_type = ["Technical Deep Dive"]

[extra]
featured = false
featured_image = "/assets/media/featured/random-07.webp"
+++

We published five security advisories in Valkey's first 21 months, from the March 2024 fork through the end of 2025.
We published seven advisories in the first eight months of 2026 and shipped almost three dozen security-adjacent fixes.
In one two-week stretch, three researchers who did not know about each other reported the same bug: a use-after-free in the script debugger, an uncommonly used feature in Valkey.

This is the state of many large open source projects. 
New AI models can search codebases for vulnerabilities cheaply, and the cost to generating reports is almost zero,
Jeremy Stanley of OpenStack's vulnerability management team calls it a ["seemingly unending deluge of reports from researchers using LLMs to mine for security gold"](https://www.openwall.com/lists/oss-security/2026/04/28/15), and kernel, Red Hat, and HAProxy maintainers [see the same duplicate reports](https://lwn.net/Articles/1070698/).

The Valkey project relies on a handful of maintainers to reproduce each report, judge severity, write the fix, coordinate the embargo, and ship it across every supported version.
It's easy to see this increase as hopeless fight against a rising tide, but we think their is hope.
In this blog we'll discuss three changes that are helping us keep up: what we count as a vulnerability, how we look for bugs ourselves, and how we ship the fixes faster.

## Updating what counts as a vulnerability

Valkey publishes a Github advisories and assigns a Common Vulnerabilities and Exposures (CVE) identifier so that organizations can track which vulnerabilities they need to patch.
Historically, we issued a CVE for any issue that affected the availability, confidentiality, or integrity of data in Valkey across clients.
That meant we issued CVEs for relatively minor issues, such as an authenticated client crashing the server with a malformed command, and coordinated patches with our end users.
Most of the security reports Valkey received fell into this category: crashes from malformed requests, either through the main client port or through Valkey's clustering port.

So we stopped issuing advisories for bugs that only impacted availability from authenticated attackers.
This class of problem was consuming maintainer time, and most malicious users had other mechanisms to cause downtime if they wanted to.
Excluding the minor issues from the CVE process recovers maintainer time for the issues that really impact our end users.

Here is how the updated policy works in practice:

- A malformed request that crashes the server before authentication gets an advisory. [CVE-2026-27623](https://github.com/valkey-io/valkey/security/advisories/GHSA-93p9-5vc7-8wgr) is this year's example.
- An out-of-bounds read reachable by an authenticated client gets an advisory. The bytes it returns may belong to another client's keys or session, which ACLs should have kept from that client.
- Memory corruption with a credible path to code execution, or any action beyond granted permissions, gets an advisory.
- A crash or hang triggered by a client that holds `EVAL` does not. That client can write a Lua loop that pins a core indefinitely, so a bug that hangs the server doesn't give it anything it couldn't already do.

## Using adversarial testing to find bugs

With TLS enabled, Valkey may decrypt more data from the TLS stream than a single command.
Valkey keeps a list of connections holding unread data and walks it once per event loop pass.
Walking means holding a pointer to the next connection while processing the current one, and processing a connection runs whatever command it sent.
If that command is `CLIENT KILL` aimed at the next connection on the list, the server frees that connection immediately, and the saved pointer now points at freed memory.
The next iteration follows that pointer, and the server crashes.

The freed memory held a connection object the server calls through.
An attacker who can place their own bytes there has a credible path to running code in the server process, which is why we generated a CVE and disclosed the issue.

We found it ourselves, on our own schedule rather than in response to a report, using the same methods security researchers are adopting.
A model reads a subsystem, threat model, or feature and proposes candidate bugs.
A second model, reading the same source, argues against each one and verifies and reproduces the bug.
A candidate reaches a person only once it comes with a test that generates a reproducible crash.
Candidates bugs typically die at that verification stage when the code already handles the case the first model misread or when the impact is too minor to act on.

Across Valkey and the JSON, search, and bloom modules, that pipeline has so far produced 34 real bugs.
We run it periodically across several frontier models, and we're hopeful we can use it during review, before code reaches a GA release.

## Automating the backport

The TLS bug above affected every version of Valkey, and a year ago a maintainer would have manually cherry-picked the fix into each supported branch.
Over the last few months, maintainers have invested heavily in automating our release process, using AI to generate backport pull requests and resolve conflicts.
If we wake up one morning to a zero-day in Valkey, we can get fixes out the door quickly.
AI agents drive all of this, but a human is responsible for making sure the merges are correct.

## What you should do next

For those that run open-source software in production: move to the current patch release of every open source project you run, Valkey included, and build a mechanism that consumes new versions regularly.
Apply the [deployment hardening guide](https://valkey.io/blog/properly-secure-your-valkey-deployment/) to make sure you're covering the Valkey security best practices.

If you find a bug: report suspected vulnerabilities to security@lists.valkey.io rather than opening an issue, and include a reproducer that runs against the build you are targeting.
A proposed fix helps but should not delay the report.

Bugs got cheaper to find.
We're using the same tools to make them cheaper to fix, and leaving the judgment about which ones matter to people.
