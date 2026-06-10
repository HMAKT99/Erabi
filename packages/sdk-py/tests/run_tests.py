"""Offline sdk-py tests: canonicalization + the frozen cross-SDK vectors.

The vectors in packages/crypto/test/vectors.json are protocol law: sdk-py
must reproduce every byte (canonical form, public key, agent id, signature).
"""

import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))

from erabi_sdk import (  # noqa: E402
    agent_id_from_public_key,
    canonicalize,
    public_key_from_seed,
    public_key_to_string,
    sign_payload,
    signing_input,
    verify,
)
from erabi_sdk.keys import b58decode  # noqa: E402

FAILURES = []


def check(name, actual, expected):
    if actual != expected:
        FAILURES.append(f"{name}: expected {expected!r}, got {actual!r}")
    else:
        print(f"ok   {name}")


def main() -> int:
    # RFC 8785 / ES number formatting
    check("num int", canonicalize(10), "10")
    check("num float", canonicalize(4.5), "4.5")
    check("num long", canonicalize(333333333.33333329), "333333333.3333333")
    check("num exp+", canonicalize(1e30), "1e+30")
    check("num exp-", canonicalize(1e-27), "1e-27")
    check("num small-dec", canonicalize(0.002), "0.002")
    check("num micro", canonicalize(0.000001), "0.000001")
    check("num nano", canonicalize(0.0000001), "1e-7")
    check("literals", canonicalize({"literals": [None, True, False]}), '{"literals":[null,true,false]}')
    check("sorting", canonicalize({"b": 2, "a": 1}), '{"a":1,"b":2}')
    check(
        "utf16 sort",
        canonicalize({"€": 1, "\U0001f600": 2, "דּ": 3}),
        '{"€":1,"\U0001f600":2,"דּ":3}',
    )
    check("escape", canonicalize("\n"), '"\\u000f\\n"')

    # Frozen cross-SDK vectors
    vectors_path = (
        pathlib.Path(__file__).resolve().parents[2] / "crypto" / "test" / "vectors.json"
    )
    vectors = json.loads(vectors_path.read_text())
    if not vectors:
        FAILURES.append("no vectors found")
    for index, vector in enumerate(vectors):
        seed = bytes.fromhex(vector["seed_hex"])
        public_key = public_key_from_seed(seed)
        check(f"vector {index} pubkey", public_key_to_string(public_key), vector["public_key"])
        check(f"vector {index} agent id", agent_id_from_public_key(public_key), vector["agent_id"])
        check(f"vector {index} canonical", canonicalize(vector["payload"]), vector["canonical"])
        check(
            f"vector {index} sig",
            sign_payload(vector["payload"], vector["ts"], vector["nonce"], seed),
            vector["sig"],
        )
        signature = b58decode(vector["sig"].split(":", 1)[1])
        message = signing_input(vector["payload"], vector["ts"], vector["nonce"])
        check(f"vector {index} verify", verify(message, signature, public_key), True)

    # Framework bindings: specs and callables line up, no frameworks needed.
    from erabi_sdk.client import Erabi
    from erabi_sdk.integrations import TOOL_SPECS, build_callables
    from erabi_sdk.keys import generate_seed

    stub = Erabi(
        seed=generate_seed(),
        manifest={"id": "erabi:agent:stub", "policy": {"human_in_loop": True}},
        endpoints={"registry": "", "exchange": "", "attribution": "", "reputation": ""},
        node_id="test",
    )
    callables = build_callables(stub)
    check(
        "integration tool names",
        sorted(callables.keys()),
        sorted(spec["name"] for spec in TOOL_SPECS),
    )

    if FAILURES:
        print("\n".join(f"FAIL {f}" for f in FAILURES), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
