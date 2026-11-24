+++
title = "Why Valkey"
description = "Valkey gets faster and leaner every release, and no single company controls it. See the performance numbers and the governance that keeps Valkey vendor neutral."
template = "why-valkey.html"

[extra]
body_class = "why-valkey-page"

# Every design on the page reads the copy below. The pillar fields term_key,
# term_value and figure are only used by some designs.

[extra.hero]
kicker = "Why Valkey"
headline = "Fast by design."
headline_accent = "Neutral by charter."
subtitle = "Valkey is an open source, in-memory data store. Every release gets faster and leaner, and the Linux Foundation makes sure no single company decides what comes next."

[[extra.hero.stats]]
value = "1B+"
label = "requests per second across a 2,000-node cluster"

[[extra.hero.stats]]
value = "1.19M"
label = "requests per second from a single node"

[[extra.hero.stats]]
value = "BSD-3"
label = "license, with no usage restrictions"

# The fourth stat is the participant count, read from _data/participants.yml.

[extra.performance]
kicker = "Performance"
title = "Faster every release"
lead = "Performance work lands in every Valkey release, and most of it needs no configuration change. Upgrade, and your existing workload gets the gain."
chart_title = "Valkey 8.0 against 7.2 on a single node"
chart_source = "@/blog/2024-07-07-unlock-one-million-rps.md"

[[extra.performance.metrics]]
title = "Throughput"
unit = "Requests per second, higher is better"
rows = [
  { label = "Valkey 7.2", value = 360000, display = "360K" },
  { label = "Valkey 8.0", value = 1190000, display = "1.19M", emphasis = true },
]

[[extra.performance.metrics]]
title = "Average latency"
unit = "Milliseconds, lower is better"
rows = [
  { label = "Valkey 7.2", value = 1.792, display = "1.79 ms" },
  { label = "Valkey 8.0", value = 0.542, display = "0.54 ms", emphasis = true },
]

[[extra.performance.releases]]
version = "8.0"
headline = "I/O threads"
points = [
  "Throughput up 230%, from 360K to 1.19M requests per second.",
  "Up to 20% less memory per node from per-slot dictionaries.",
]
post = "@/blog/2024-07-07-unlock-one-million-rps.md"

[[extra.performance.releases]]
version = "8.1"
headline = "A new hashtable"
points = [
  "About 20 bytes saved per key, and up to 30 with a TTL.",
  "Active defrag no longer causes pauses over 1 ms.",
]
post = "@/blog/2025-04-02-valkey-8-1-0-ga.md"

[[extra.performance.releases]]
version = "9.0"
headline = "Billion-request clusters"
points = [
  "Over 1 billion requests per second on 2,000 nodes.",
  "Bounded recovery with up to half the primaries killed.",
]
post = "@/blog/2025-10-20-1-billion-rps/index.md"

[[extra.performance.releases]]
version = "9.1"
headline = "Leaner keys"
points = [
  "Up to 44% less memory overhead per string key.",
  "No command or configuration changes.",
]
post = "@/blog/2026-08-13-9.1-memory-efficiency/index.md"

[[extra.performance.releases]]
version = "9.2"
headline = "Forkless snapshots"
points = [
  "Saves and full syncs run without forking the server.",
  "Large sorted sets use 36% to 43% less overhead per member.",
]
post = "@/blog/2026-11-15-valkey-9.2-release/index.md"

[extra.neutrality]
kicker = "Vendor neutrality"
title = "No vendor holds the keys"
lead = "Valkey belongs to the Linux Foundation and the people who build it. The rules that keep it that way are written down, and they bind every company that contributes."

[[extra.neutrality.pillars]]
icon = "foundation"
term_key = "steward"
term_value = "Linux Foundation"
title = "Linux Foundation stewardship"
description = "The Valkey name and logo are trademarks of LF Projects, not of any company that contributes code."

[[extra.neutrality.pillars]]
icon = "license"
term_key = "license"
term_value = "BSD-3-Clause"
title = "BSD-3-Clause, forever"
description = "Run it, embed it, or sell it as a managed service. There are no source-available terms and no field-of-use limits."

[[extra.neutrality.pillars]]
icon = "balance"
term_key = "max-tsc-share"
term_value = "1/3 per organization"
figure = "1/3"
title = "A one-third cap"
description = "No organization may hold more than a third of the Technical Steering Committee seats. If a hire or an acquisition breaks the cap, the TSC must restore it."
link = "https://github.com/valkey-io/valkey/blob/unstable/GOVERNANCE.md"
link_text = "Read the governance"

[[extra.neutrality.pillars]]
icon = "signature"
term_key = "cla"
term_value = "none"
title = "No CLA"
description = "Contributors keep their copyright and sign off each commit with the Developer Certificate of Origin. No company collects the rights to relicense."

[[extra.neutrality.pillars]]
icon = "vote"
term_key = "major-decisions"
term_value = "public TSC vote"
title = "Decisions in the open"
description = "New APIs, data structure changes, and compatibility breaks are major decisions, voted on by the TSC in public GitHub threads."

[[extra.neutrality.pillars]]
icon = "cloud"
term_key = "runs-on"
term_value = "anywhere"
title = "Run it anywhere"
description = "The same server runs on a laptop, in Kubernetes, or as a managed service from many providers. Moving between them doesn't mean rewriting your app."

[extra.compatibility]
title = "Switching is an upgrade"
lead = "Valkey began as a fork of Redis OSS 7.2.4. Moving from Redis OSS 7.2 or earlier keeps your clients, your data files, and your configuration."
button_text = "Read the migration guide"
button_url = "/topics/migration/"
checks = [
  { title = "Protocol", description = "RESP2 and RESP3. Existing client libraries connect without code changes." },
  { title = "Persistence", description = "Reads and writes RDB and AOF files compatible with Redis OSS 7.2." },
  { title = "Configuration", description = "Accepts Redis OSS 7.2 configuration directives as they are." },
  { title = "Tooling", description = "redis-cli works with Valkey, and valkey-cli works with Redis OSS." },
]

[extra.cta]
title = "Start in minutes"
links = [
  { text = "Download Valkey", url = "/download/" },
  { text = "Try it in your browser", url = "/try-valkey/" },
  { text = "Join the community", url = "/community/" },
]
+++
