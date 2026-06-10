"""Erabi Python SDK: the 3-line integration, mirroring @erabi/sdk.

    from erabi_sdk import Erabi
    erabi = Erabi.register(name="MyAgent", capabilities=["agent.research"])
    choices = erabi.intent(category="data.financial", constraints={"max_price_usd": 1})
    # later: erabi.report_outcome(choices["auction_id"], provider_id, "task_success")
"""

import hashlib
import json
import urllib.error
import urllib.request
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from .canonical import canonicalize
from .envelope import create_envelope
from .keys import agent_id_from_public_key, generate_seed, public_key_from_seed, public_key_to_string

__all__ = ["Erabi", "ErabiError", "DEFAULT_ENDPOINTS"]

DEFAULT_ENDPOINTS = {
    "registry": "http://localhost:4001",
    "exchange": "http://localhost:4002",
    "attribution": "http://localhost:4003",
    "reputation": "http://localhost:4004",
}


class ErabiError(Exception):
    def __init__(self, status: int, code: str, message: str):
        super().__init__(f"[{status} {code}] {message}")
        self.status = status
        self.code = code


def _request(method: str, url: str, body: Optional[Any] = None) -> Dict[str, Any]:
    data = json.dumps(body).encode("utf-8") if body is not None else None
    request = urllib.request.Request(
        url, data=data, method=method, headers={"content-type": "application/json"}
    )
    try:
        with urllib.request.urlopen(request) as response:
            text = response.read().decode("utf-8")
            return json.loads(text) if text else {}
    except urllib.error.HTTPError as err:
        try:
            payload = json.loads(err.read().decode("utf-8"))
            error = payload.get("error", {})
            raise ErabiError(err.code, error.get("code", "http_error"), error.get("message", str(err)))
        except (ValueError, KeyError):
            raise ErabiError(err.code, "http_error", str(err))


class Erabi:
    def __init__(self, seed: bytes, manifest: Dict[str, Any], endpoints: Dict[str, str], node_id: str):
        self.seed = seed
        self.manifest = manifest
        self.id: str = manifest["id"]
        self.endpoints = endpoints
        self.node_id = node_id

    @classmethod
    def register(
        cls,
        name: str,
        capabilities: List[str],
        endpoints: Optional[Dict[str, str]] = None,
        endpoint: str = "https://example.invalid/agent",
        owner_type: str = "individual",
        verification: Optional[List[str]] = None,
        payout_binding: Optional[str] = None,
        accepts_sponsored: bool = False,
        max_sponsored_ratio: float = 0.3,
        human_in_loop: bool = True,
        referrer: Optional[str] = None,
        node_id: str = "erabi-sdk-py",
        seed: Optional[bytes] = None,
    ) -> "Erabi":
        merged = {**DEFAULT_ENDPOINTS, **(endpoints or {})}
        seed = seed or generate_seed()
        public_key = public_key_from_seed(seed)
        agent_id = agent_id_from_public_key(public_key)
        created = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")
        manifest = {
            "spec_version": "0.1",
            "id": agent_id,
            "name": name,
            "public_key": public_key_to_string(public_key),
            "owner": {
                "type": owner_type,
                "verification": verification or [],
                "payout_binding": payout_binding,
            },
            "capabilities": capabilities,
            "endpoint": endpoint,
            "roles": ["consumer", "provider"],
            "policy": {
                "accepts_sponsored": accepts_sponsored,
                "max_sponsored_ratio": max_sponsored_ratio,
                "human_in_loop": human_in_loop,
            },
            "referrer": referrer,
            "created_at": created,
        }
        client = cls(seed, manifest, merged, node_id)
        _request("POST", f"{merged['registry']}/v1/agents", client.signed(manifest))
        return client

    def signed(self, payload: Any) -> Dict[str, Any]:
        return create_envelope(payload, self.seed, self.id, self.node_id)

    def intent(
        self,
        category: str,
        query: Optional[str] = None,
        constraints: Optional[Dict[str, Any]] = None,
        human_in_loop: Optional[bool] = None,
        context: Any = None,
        ttl_ms: int = 3000,
    ) -> Dict[str, Any]:
        if context is not None:
            context_hash = "sha256:" + hashlib.sha256(canonicalize(context).encode()).hexdigest()
        else:
            context_hash = "sha256:" + hashlib.sha256(b"erabi:no-context").hexdigest()
        intent = {
            "intent_id": str(uuid.uuid4()),
            "agent_id": self.id,
            "category": category,
            "query": query or category,
            "constraints": constraints or {},
            "context_hash": context_hash,
            "human_in_loop": (
                human_in_loop
                if human_in_loop is not None
                else self.manifest["policy"]["human_in_loop"]
            ),
            "ttl_ms": ttl_ms,
        }
        return _request("POST", f"{self.endpoints['exchange']}/v1/intents", self.signed(intent))

    def report_outcome(
        self,
        auction_id: str,
        provider_id: str,
        kind: str,
        value_usd: float = 0.0,
        rail_receipt: Optional[Dict[str, str]] = None,
    ) -> Dict[str, Any]:
        return _request(
            "POST",
            f"{self.endpoints['attribution']}/v1/events",
            self.signed(
                {
                    "event_id": str(uuid.uuid4()),
                    "auction_id": auction_id,
                    "kind": kind,
                    "provider_id": provider_id,
                    "value_usd": value_usd,
                    "rail_receipt": rail_receipt,
                }
            ),
        )

    def confirm_outcome(self, event_id: str, event_hash: str) -> Dict[str, Any]:
        return _request(
            "POST",
            f"{self.endpoints['attribution']}/v1/events/{event_id}/confirm",
            self.signed({"event_id": event_id, "hash": event_hash}),
        )

    def discover(self, capability: str, limit: int = 10) -> Dict[str, Any]:
        return _request(
            "POST",
            f"{self.endpoints['registry']}/v1/discover",
            {"capability": capability, "limit": limit},
        )

    def my_reputation(self) -> Dict[str, Any]:
        return _request("GET", f"{self.endpoints['reputation']}/v1/reputation/{self.id}")

    def my_earnings(self) -> Dict[str, Any]:
        return _request("GET", f"{self.endpoints['attribution']}/v1/earnings/{self.id}")

    def feedback(self) -> Dict[str, Any]:
        return _request("GET", f"{self.endpoints['attribution']}/v1/feedback/{self.id}")
