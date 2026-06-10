# Open dataset releases

Every intent produces a full decision tuple — including organic-only intents:

```
(intent_features, candidate_set, ranking_scores, selection, outcome, value_usd, timestamps)
```

stored append-only by the exchange (`decision_tuples`). Tuples are PII-free by
construction: intents carry no user identifiers, queries are stored as lengths only,
and outcomes are dual-signed settlement facts rather than self-reports.

## Release plan

- **Cadence:** quarterly dumps of anonymized tuples under CC BY 4.0.
- **Anonymization:** agent ids are replaced with stable per-dump pseudonyms; absolute
  timestamps are coarsened to hours; categories, constraints, ranking scores,
  clearing prices, outcomes, and values are released as-is.
- **Format:** JSONL, one tuple per line, with a versioned header record describing the
  schema (`erabi-tuples/<spec version>/<quarter>`).
- **Intended use:** the canonical public benchmark for agent decision-making research —
  selection policies with a cryptographically verified, economically grounded reward
  signal.

## Pipeline status

0.1 ships the storage layer and this specification. The export pipeline
(pseudonymization pass + JSONL writer over `decision_tuples`) is a stub tracked for a
post-launch milestone; the dataset accumulates from day one regardless.
