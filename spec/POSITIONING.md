# Positioning

**ERABI is the intent auction and reputation layer of the agent economy.**

The agentic-commerce stack already has strong layers for _moving money_: x402 settles
machine-to-machine payments, AP2 expresses payment authorization mandates, ACP and UCP
standardize checkout and merchant surfaces. ERABI deliberately builds none of those.
What the stack lacks is the layer _before_ money moves: how an agent selects a
provider, why, what influenced that selection, and whether the outcome actually
happened. That selection-and-influence layer is ERABI.

## What ERABI is

- An **intent exchange**: structured, PII-free moments of choice, matched against
  standing bids in a quality-weighted second-price auction where reputation is the
  quality score.
- A **disclosure regime**: every paid placement carries a signed, publicly verifiable
  `DisclosureRecord`. This is the protocol's invariant.
- A **reputation system**: scores derived only from dual-signed settlement events,
  recomputable by anyone from public evidence.
- An **attribution ledger**: hash-chained outcome events with holdback windows,
  dispute freezing, and anomaly screening.

## What ERABI is not

- **Not a payment rail.** Settlement executes on x402, AP2, affiliate networks, or
  stays ledger-only. ERABI records the truth; the rail moves the money.
- **Not a prompt-injection channel.** ERABI never inserts content into prompts or
  model context. It returns structured, labeled data to the calling agent's _code_;
  whether and how anything is surfaced is the developer's choice. Consumer policy
  defaults to `accepts_sponsored: false` — monetization is opt-in, never ambient.
- **Not a human-attention ad network.** The unit is an agent's moment of choice, not
  an impression. There are no eyeballs here to monetize.
- **Not a marketplace operator.** ERABI does not fulfill tasks, hold inventory, or
  take custody of funds. It clears selection and verifies outcomes.

## Degradation is graceful

Where advertising does not fit — informational intents, categories with no conversion
event, regulated verticals — discovery and reputation still work. ERABI degrades to
trust infrastructure; it never forces monetization to be useful.
