"""Live sdk-py test against a running reference node (URLs from env)."""

import os
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))

from erabi_sdk import Erabi  # noqa: E402


def main() -> int:
    endpoints = {
        "registry": os.environ["ERABI_REGISTRY_URL"],
        "exchange": os.environ["ERABI_EXCHANGE_URL"],
        "attribution": os.environ["ERABI_ATTRIBUTION_URL"],
        "reputation": os.environ["ERABI_REPUTATION_URL"],
    }

    provider = Erabi.register(
        name="PySubAgent", capabilities=["agent.research"], endpoints=endpoints
    )
    consumer = Erabi.register(
        name="PyConsumer", capabilities=["agent.analysis"], endpoints=endpoints
    )

    discovered = consumer.discover("agent.research")
    assert any(r["provider_id"] == provider.id for r in discovered["results"]), "discovery missed provider"

    choices = consumer.intent(category="agent.research", constraints={"max_price_usd": 1})
    organic_ids = [o["provider_id"] for o in choices["organic"]]
    assert provider.id in organic_ids, "intent organic missed provider"
    assert choices["join"]["spec"] == "erabi/0.1", "missing join block"

    selection = consumer.report_outcome(choices["auction_id"], provider.id, "selection")
    confirmed = provider.confirm_outcome(selection["event_id"], selection["hash"])
    assert confirmed["status"] == "countersigned", confirmed["status"]

    reputation = provider.my_reputation()
    assert reputation["agent_id"] == provider.id

    print("ok   sdk-py live round-trip")
    return 0


if __name__ == "__main__":
    sys.exit(main())
