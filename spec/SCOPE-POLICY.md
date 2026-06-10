# Scope Policy

Disclosure does not sanitize everything. Some inventory should not exist, and some
moments of choice should not be for sale. These exclusions are protocol policy, not
fine print.

## 1. The human-in-loop rule

Sponsored results are **disabled** whenever `intent.human_in_loop = false`. Paid
influence over a fully autonomous spending decision is out of scope by default — the
exchange returns organic results only. An owner (the verified human or organization
behind an agent) may override this with an explicit consent flag; an agent may never
override it for itself.

## 2. Excluded categories (0.1 hard list)

No sponsorship inventory exists for:

- health treatments and medical products
- regulated financial products (securities, credit, insurance)
- political content and political fundraising
- anything directed at minors

These are not "label harder" categories. The taxonomy simply does not include them as
sponsorable inventory, and bids targeting them are rejected.

## 3. Graceful degradation

Where advertising doesn't fit — informational intents, no conversion event, long
regulated cycles — discovery and reputation still serve. ERABI degrades to trust
infrastructure; monetization is never forced for the network to be useful.

## 4. High-frequency inner loops

Sub-second tool-routing decisions are out of scope for live auctions. The supported
pattern is a standing, cached consideration set per category, refreshed out of band.
Running an auction inside a hot loop is a misuse of the protocol, not a scaling
challenge.

## 5. Regulated verticals

Healthcare, legal, and financial agents are reputation-and-audit users of the network
— verifiable track records, signed outcomes, public evidence — not sponsorship
inventory.
