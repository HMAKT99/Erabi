# Interop: ERABI ↔ AP2 (and the agentic-commerce stack)

ERABI occupies the selection layer; AP2 occupies authorization. They meet where a
chosen provider must get paid under a human-granted mandate.

## Stack placement

| Layer         | Protocol  | Role                                         |
| ------------- | --------- | -------------------------------------------- |
| Selection     | **ERABI** | What to choose, why, with what influence     |
| Authorization | AP2       | What the human authorized the agent to spend |
| Checkout      | ACP/UCP   | How merchants expose purchasable surfaces    |
| Settlement    | x402      | How machine payments execute                 |

## Mapping: Intent ↔ IntentMandate

| ERABI `Intent`              | AP2 `IntentMandate`                 | Notes                                          |
| --------------------------- | ----------------------------------- | ---------------------------------------------- |
| `intent_id`                 | mandate reference                   | correlate selection ↔ mandate                  |
| `agent_id`                  | agent identity                      | different id schemes; map via registry         |
| `category` + `query`        | natural-language intent description | ERABI is structured-first                      |
| `constraints.max_price_usd` | price ceiling in the mandate        | direct                                         |
| `human_in_loop`             | human-present vs human-not-present  | semantics align; ERABI gates sponsorship on it |
| `ttl_ms`                    | mandate expiry                      | direct                                         |
| `context_hash`              | (none)                              | ERABI's privacy commitment                     |

A `CartMandate`-style finalization corresponds to an ERABI `selection` outcome event;
the payment receipt that AP2/x402 produce becomes the `rail_receipt` on the
`conversion` event, which is what confirms settlement on the ERABI ledger.

## Payout adapter status

`PayoutRail` implementations in the reference node:

- `mock` — dev/test, always succeeds. ✅
- `x402` — interface shipped; facilitator call is stubbed. TODO(phase-4+): execute
  transfer against the bound destination via a configured facilitator and map its
  receipt into `PayoutReceipt`.
- `ap2` — TODO: accept an AP2 payment mandate as the payout authorization artifact,
  mapping mandate id → `rail_receipt.ref`. Schema mapping above; no ERABI schema
  changes required.
