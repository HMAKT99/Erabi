# AUTO-GENERATED from packages/schemas/json — do not edit. Run `pnpm codegen`.
from typing import Any, Dict, List, Literal, Optional, Union

from typing_extensions import Annotated
from pydantic import BaseModel, ConfigDict, Field


class AgentManifestOwner(BaseModel):
    model_config = ConfigDict(extra="forbid")
    type: Literal["org", "individual", "unbound"]
    verification: List[Annotated[str, Field(min_length=1, max_length=256)]]
    payout_binding: Optional[Annotated[str, Field(pattern="^sha256:[0-9a-f]{64}$")]]


class AgentManifestPolicy(BaseModel):
    model_config = ConfigDict(extra="forbid")
    accepts_sponsored: bool
    max_sponsored_ratio: Annotated[float, Field(ge=0, le=1)]
    human_in_loop: bool


class AgentManifest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    spec_version: Literal["0.1"]
    id: Annotated[str, Field(pattern="^erabi:agent:[1-9A-HJ-NP-Za-km-z]{32,50}$")]
    name: Annotated[str, Field(min_length=1, max_length=120)]
    public_key: Annotated[str, Field(pattern="^ed25519:[1-9A-HJ-NP-Za-km-z]{32,50}$")]
    owner: AgentManifestOwner
    capabilities: Annotated[List[Annotated[str, Field(pattern="^(data|api|agent|compute|commerce)\\.[a-z0-9-]+$")]], Field(min_length=1, max_length=50)]
    endpoint: Annotated[str, Field(max_length=2048)]
    roles: Annotated[List[Literal["consumer", "provider"]], Field(min_length=1, max_length=2)]
    policy: AgentManifestPolicy
    referrer: Optional[Annotated[str, Field(pattern="^erabi:agent:[1-9A-HJ-NP-Za-km-z]{32,50}$")]]
    created_at: str


class BidTargeting(BaseModel):
    model_config = ConfigDict(extra="forbid")
    categories: Annotated[List[Annotated[str, Field(pattern="^(data|api|agent|compute|commerce)\\.[a-z0-9-]+$")]], Field(min_length=1, max_length=20)]
    constraints_filter: Optional[Annotated[str, Field(max_length=1024)]] = None


class BidOffer(BaseModel):
    model_config = ConfigDict(extra="forbid")
    type: Literal["cpa", "cpc", "rev_share"]
    amount_usd: Annotated[float, Field(gt=0)]


class BidCreative(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: Annotated[str, Field(min_length=1, max_length=80)]
    claim: Annotated[str, Field(min_length=1, max_length=200)]
    endpoint: Annotated[str, Field(max_length=2048)]


class BidBudget(BaseModel):
    model_config = ConfigDict(extra="forbid")
    daily_usd: Annotated[float, Field(gt=0)]


class Bid(BaseModel):
    model_config = ConfigDict(extra="forbid")
    bid_id: str
    provider_id: Annotated[str, Field(pattern="^erabi:agent:[1-9A-HJ-NP-Za-km-z]{32,50}$")]
    targeting: BidTargeting
    offer: BidOffer
    creative: BidCreative
    budget: BidBudget
    settlement_rail: Literal["x402", "ap2", "affiliate", "ledger_only"]
    stake_tier: Literal["unverified", "verified", "staked", "bridge"]


class ConsiderationSetOrganicItem(BaseModel):
    model_config = ConfigDict(extra="forbid")
    provider_id: Annotated[str, Field(pattern="^erabi:agent:[1-9A-HJ-NP-Za-km-z]{32,50}$")]
    reputation: Annotated[float, Field(ge=0, le=100)]
    evidence_url: Annotated[str, Field(max_length=2048)]
    reason: Annotated[str, Field(min_length=1, max_length=200)]


class ConsiderationSetSponsoredItemCreative(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: Annotated[str, Field(min_length=1, max_length=80)]
    claim: Annotated[str, Field(min_length=1, max_length=200)]
    endpoint: Annotated[str, Field(max_length=2048)]


class ConsiderationSetSponsoredItemDisclosure(BaseModel):
    model_config = ConfigDict(extra="forbid")
    disclosure_id: str
    auction_id: str
    intent_id: str
    provider_id: Annotated[str, Field(pattern="^erabi:agent:[1-9A-HJ-NP-Za-km-z]{32,50}$")]
    payment_model: Literal["cpa", "cpc", "rev_share"]
    clearing_price_usd: Annotated[float, Field(ge=0)]
    label: Annotated[str, Field(pattern="Sponsored", min_length=9, max_length=200)]
    issued_at: str
    exchange_sig: Annotated[str, Field(pattern="^ed25519:[1-9A-HJ-NP-Za-km-z]{64,96}$")]


class ConsiderationSetSponsoredItem(BaseModel):
    model_config = ConfigDict(extra="forbid")
    provider_id: Annotated[str, Field(pattern="^erabi:agent:[1-9A-HJ-NP-Za-km-z]{32,50}$")]
    creative: ConsiderationSetSponsoredItemCreative
    disclosure: ConsiderationSetSponsoredItemDisclosure


class ConsiderationSetJoin(BaseModel):
    model_config = ConfigDict(extra="forbid")
    spec: Literal["erabi/0.1"]
    register: Annotated[str, Field(max_length=2048)]
    well_known: Annotated[str, Field(min_length=1, max_length=256)]


class ConsiderationSet(BaseModel):
    model_config = ConfigDict(extra="forbid")
    intent_id: str
    organic: Annotated[List[ConsiderationSetOrganicItem], Field(max_length=50)]
    sponsored: Annotated[List[ConsiderationSetSponsoredItem], Field(max_length=2)]
    auction_id: str
    join: ConsiderationSetJoin
    exchange_sig: Annotated[str, Field(pattern="^ed25519:[1-9A-HJ-NP-Za-km-z]{64,96}$")]


class DisclosureRecord(BaseModel):
    model_config = ConfigDict(extra="forbid")
    disclosure_id: str
    auction_id: str
    intent_id: str
    provider_id: Annotated[str, Field(pattern="^erabi:agent:[1-9A-HJ-NP-Za-km-z]{32,50}$")]
    payment_model: Literal["cpa", "cpc", "rev_share"]
    clearing_price_usd: Annotated[float, Field(ge=0)]
    label: Annotated[str, Field(pattern="Sponsored", min_length=9, max_length=200)]
    issued_at: str
    exchange_sig: Annotated[str, Field(pattern="^ed25519:[1-9A-HJ-NP-Za-km-z]{64,96}$")]


class Envelope(BaseModel):
    model_config = ConfigDict(extra="forbid")
    payload: Dict[str, Any]
    sig: Annotated[str, Field(pattern="^ed25519:[1-9A-HJ-NP-Za-km-z]{64,96}$")]
    key_id: Annotated[str, Field(min_length=1, max_length=256)]
    ts: str
    nonce: Annotated[str, Field(min_length=8, max_length=128)]
    node_id: Annotated[str, Field(min_length=1, max_length=128)]


class IntentConstraints(BaseModel):
    model_config = ConfigDict(extra="forbid")
    max_price_usd: Optional[Annotated[float, Field(ge=0)]] = None
    max_latency_ms: Optional[Annotated[int, Field(ge=1)]] = None


class Intent(BaseModel):
    model_config = ConfigDict(extra="forbid")
    intent_id: str
    agent_id: Annotated[str, Field(pattern="^erabi:agent:[1-9A-HJ-NP-Za-km-z]{32,50}$")]
    category: Annotated[str, Field(pattern="^(data|api|agent|compute|commerce)\\.[a-z0-9-]+$")]
    query: Annotated[str, Field(min_length=1, max_length=2000)]
    constraints: IntentConstraints
    context_hash: Annotated[str, Field(pattern="^sha256:[0-9a-f]{64}$")]
    human_in_loop: bool
    ttl_ms: Annotated[int, Field(ge=1, le=600000)]


class OutcomeEventCounterpartyConfirmation(BaseModel):
    model_config = ConfigDict(extra="forbid")
    sig: Annotated[str, Field(pattern="^ed25519:[1-9A-HJ-NP-Za-km-z]{64,96}$")]
    key_id: Annotated[str, Field(min_length=1, max_length=256)]


class OutcomeEventRailReceipt(BaseModel):
    model_config = ConfigDict(extra="forbid")
    rail: Literal["x402", "ap2", "affiliate", "ledger_only"]
    ref: Annotated[str, Field(min_length=1, max_length=512)]


class OutcomeEvent(BaseModel):
    model_config = ConfigDict(extra="forbid")
    event_id: str
    auction_id: str
    kind: Literal["selection", "click", "conversion", "task_success", "assisted", "dispute"]
    reported_by: Annotated[str, Field(pattern="^erabi:agent:[1-9A-HJ-NP-Za-km-z]{32,50}$")]
    counterparty_confirmation: Optional[OutcomeEventCounterpartyConfirmation]
    value_usd: Annotated[float, Field(ge=0)]
    rail_receipt: Optional[OutcomeEventRailReceipt]
    prev_hash: Optional[Annotated[str, Field(pattern="^sha256:[0-9a-f]{64}$")]]
    hash: Annotated[str, Field(pattern="^sha256:[0-9a-f]{64}$")]
