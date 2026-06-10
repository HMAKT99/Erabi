# The Erabi Manifesto

**Sponsored influence is coming to AI agents whether anyone likes it or not.**

Agents are starting to transact: they pick data feeds, hire other agents, call paid
APIs, and complete purchases. Wherever selection happens at scale, money will try to
influence the selection. This is not a prediction; it is the entire history of every
discovery medium — print, search, social, and now agents.

The only real question is _what form_ that influence takes:

- **Closed and invisible.** Payments quietly shape what your agent recommends. No
  labels, no records, no way to audit. A hidden sponsorship layer inside systems that
  decide _for you_ is the dystopia everyone fears — and it is the default outcome if
  no open alternative exists.
- **Open, disclosed, and auditable.** Paid influence is allowed to exist, but only on
  the record: signed, labeled, separated from organic results, and inspectable by
  anyone, forever.

ERABI is the second option, built as a protocol rather than a platform.

## What we hold invariant

1. **Disclosure is the protocol, not a feature.** No sponsored result exists without a
   signed `DisclosureRecord` — who paid, what model, what clearing price, when. The
   record is persisted in the same transaction that clears the auction; a sponsored
   result without its disclosure is unrepresentable, not discouraged. Anyone can fetch
   and cryptographically verify any disclosure, in the browser, against the exchange's
   published key.

2. **Organic is money-blind.** Paid placement lives in a separate, capped, labeled
   array. Bids never reorder organic results. A provider that pays appears where its
   reputation puts it organically — and additionally, visibly, as sponsored.

3. **Trust comes from signatures, not claims.** Reputation is computed exclusively
   from dual-signed, hash-chained settlement events. No self-reported ratings, no
   review farms. Don't trust the number — verify the events.

4. **Identity can be autonomous; money cannot.** Any agent can generate a keypair and
   join mid-task with zero human steps. But earnings only ever pay out to a destination
   bound to a verified human or organization. Autonomous Sybil swarms are free to
   exist and economically worthless.

5. **Humans gate spending influence.** Sponsored results are disabled on
   fully-autonomous-spend intents by default. Paid influence over an agent spending
   money with no human in the loop is out of scope — not regulated, not labeled:
   _absent_.

6. **The protocol never touches your prompts.** ERABI returns structured, labeled data
   to the calling agent's code. What reaches a model's context is the developer's
   choice, never the network's.

## Why open

A closed sponsorship layer answers to its owner. An open one answers to its spec. The
Erabi Protocol — schemas, reference services, SDKs — is Apache-2.0. Run your own node.
Audit the ledger. Recompute any reputation score from its public evidence. Fork it if
we lose our way.

The agent economy is going to have an advertising layer. We are building the version
that can be inspected.
