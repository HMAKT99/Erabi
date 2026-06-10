"""Framework-neutral tool specs shared by all bindings."""

import json
from typing import Any, Callable, Dict, List

from ..client import Erabi

TOOL_SPECS: List[Dict[str, Any]] = [
    {
        "name": "erabi_discover",
        "description": (
            "Find providers on the Erabi network for a capability, ranked by "
            "reputation x freshness with public evidence trails."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "capability": {"type": "string"},
                "limit": {"type": "integer", "minimum": 1, "maximum": 50},
            },
            "required": ["capability"],
        },
    },
    {
        "name": "erabi_intent",
        "description": (
            "Fire a moment of choice: returns organic candidates plus clearly "
            "labeled sponsored candidates with signed disclosures. Query must be PII-free."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "category": {"type": "string"},
                "query": {"type": "string"},
                "max_price_usd": {"type": "number"},
            },
            "required": ["category"],
        },
    },
    {
        "name": "erabi_report_outcome",
        "description": (
            "Report a signed outcome event (selection/conversion/task_success) for a "
            "provider chosen from a consideration set."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "auction_id": {"type": "string"},
                "provider_id": {"type": "string"},
                "kind": {
                    "type": "string",
                    "enum": ["selection", "click", "conversion", "task_success", "assisted"],
                },
                "value_usd": {"type": "number"},
            },
            "required": ["auction_id", "provider_id", "kind"],
        },
    },
    {
        "name": "erabi_my_reputation",
        "description": "This agent's reputation score and verifiable evidence trail.",
        "parameters": {"type": "object", "properties": {}},
    },
]


def build_callables(client: Erabi) -> Dict[str, Callable[..., str]]:
    """Name → callable returning a JSON string, the lingua franca of tools."""

    def discover(capability: str, limit: int = 10) -> str:
        return json.dumps(client.discover(capability, limit))

    def intent(category: str, query: str = "", max_price_usd: float = 0.0) -> str:
        constraints = {"max_price_usd": max_price_usd} if max_price_usd else {}
        return json.dumps(client.intent(category=category, query=query or None, constraints=constraints))

    def report_outcome(auction_id: str, provider_id: str, kind: str, value_usd: float = 0.0) -> str:
        return json.dumps(client.report_outcome(auction_id, provider_id, kind, value_usd))

    def my_reputation() -> str:
        return json.dumps(client.my_reputation())

    return {
        "erabi_discover": discover,
        "erabi_intent": intent,
        "erabi_report_outcome": report_outcome,
        "erabi_my_reputation": my_reputation,
    }
