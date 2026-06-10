"""Spec §6 envelopes: sig = ed25519(canonical_json(payload) || ts || nonce)."""

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from .canonical import canonicalize
from .keys import sign, signature_to_string

__all__ = ["signing_input", "sign_payload", "create_envelope"]


def now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.") + (
        f"{datetime.now(timezone.utc).microsecond // 1000:03d}Z"
    )


def signing_input(payload: Any, ts: str, nonce: str) -> bytes:
    return (canonicalize(payload) + ts + nonce).encode("utf-8")


def sign_payload(payload: Any, ts: str, nonce: str, seed: bytes) -> str:
    return signature_to_string(sign(signing_input(payload, ts, nonce), seed))


def create_envelope(
    payload: Any,
    seed: bytes,
    key_id: str,
    node_id: str = "erabi-sdk-py",
    ts: Optional[str] = None,
    nonce: Optional[str] = None,
) -> Dict[str, Any]:
    ts = ts or now_iso()
    nonce = nonce or str(uuid.uuid4())
    return {
        "payload": payload,
        "sig": sign_payload(payload, ts, nonce, seed),
        "key_id": key_id,
        "ts": ts,
        "nonce": nonce,
        "node_id": node_id,
    }
