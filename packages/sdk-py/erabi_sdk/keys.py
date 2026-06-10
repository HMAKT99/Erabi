"""Ed25519 identity: keypairs, base58 wire encodings, agent ids."""

import os
from typing import Tuple

from cryptography.hazmat.primitives.asymmetric.ed25519 import (
    Ed25519PrivateKey,
    Ed25519PublicKey,
)
from cryptography.hazmat.primitives.serialization import (
    Encoding,
    NoEncryption,
    PrivateFormat,
    PublicFormat,
)

__all__ = [
    "AGENT_ID_PREFIX",
    "b58encode",
    "b58decode",
    "generate_seed",
    "public_key_from_seed",
    "public_key_to_string",
    "agent_id_from_public_key",
    "sign",
    "signature_to_string",
]

AGENT_ID_PREFIX = "erabi:agent:"
_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"


def b58encode(data: bytes) -> str:
    n = int.from_bytes(data, "big")
    out = ""
    while n > 0:
        n, rem = divmod(n, 58)
        out = _ALPHABET[rem] + out
    pad = 0
    for byte in data:
        if byte == 0:
            pad += 1
        else:
            break
    return "1" * pad + out


def b58decode(text: str) -> bytes:
    n = 0
    for char in text:
        n = n * 58 + _ALPHABET.index(char)
    body = n.to_bytes((n.bit_length() + 7) // 8, "big") if n > 0 else b""
    pad = 0
    for char in text:
        if char == "1":
            pad += 1
        else:
            break
    return b"\x00" * pad + body


def generate_seed() -> bytes:
    return os.urandom(32)


def public_key_from_seed(seed: bytes) -> bytes:
    private = Ed25519PrivateKey.from_private_bytes(seed)
    return private.public_key().public_bytes(Encoding.Raw, PublicFormat.Raw)


def public_key_to_string(public_key: bytes) -> str:
    return "ed25519:" + b58encode(public_key)


def agent_id_from_public_key(public_key: bytes) -> str:
    return AGENT_ID_PREFIX + b58encode(public_key)


def sign(message: bytes, seed: bytes) -> bytes:
    return Ed25519PrivateKey.from_private_bytes(seed).sign(message)


def signature_to_string(signature: bytes) -> str:
    return "ed25519:" + b58encode(signature)


def keypair_from_seed(seed: bytes) -> Tuple[bytes, bytes]:
    return seed, public_key_from_seed(seed)


def verify(message: bytes, signature: bytes, public_key: bytes) -> bool:
    try:
        Ed25519PublicKey.from_public_bytes(public_key).verify(signature, message)
        return True
    except Exception:
        return False


def _private_bytes(private: Ed25519PrivateKey) -> bytes:
    return private.private_bytes(Encoding.Raw, PrivateFormat.Raw, NoEncryption())
