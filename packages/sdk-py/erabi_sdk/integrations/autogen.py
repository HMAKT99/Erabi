"""AutoGen binding: register the Erabi callables on agents.

    register_erabi_tools(erabi, caller=assistant, executor=user_proxy)

Uses the standard `register_for_llm` / `register_for_execution` pattern; the
framework objects are supplied by the host application.
"""

from typing import Any

from ..client import Erabi
from .tools import TOOL_SPECS, build_callables


def register_erabi_tools(client: Erabi, caller: Any, executor: Any) -> None:
    callables = build_callables(client)
    for spec in TOOL_SPECS:
        func = callables[spec["name"]]
        func.__name__ = spec["name"]
        func.__doc__ = spec["description"]
        caller.register_for_llm(name=spec["name"], description=spec["description"])(func)
        executor.register_for_execution(name=spec["name"])(func)
