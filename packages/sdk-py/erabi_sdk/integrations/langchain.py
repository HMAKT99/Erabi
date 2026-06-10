"""LangChain binding: `get_erabi_tools(client, Tool)` → list of Tool.

    from langchain_core.tools import Tool
    tools = get_erabi_tools(erabi, Tool)
"""

from typing import Any, List

from ..client import Erabi
from .tools import TOOL_SPECS, build_callables


def get_erabi_tools(client: Erabi, tool_class: Any) -> List[Any]:
    callables = build_callables(client)
    return [
        tool_class(
            name=spec["name"],
            description=spec["description"],
            func=callables[spec["name"]],
        )
        for spec in TOOL_SPECS
    ]
