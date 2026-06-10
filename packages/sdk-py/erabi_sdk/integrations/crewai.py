"""CrewAI binding: decorate the Erabi callables with crewai's @tool.

    from crewai.tools import tool
    tools = get_erabi_tools(erabi, tool)
"""

from typing import Any, Callable, List

from ..client import Erabi
from .tools import TOOL_SPECS, build_callables


def get_erabi_tools(client: Erabi, tool_decorator: Callable[..., Any]) -> List[Any]:
    callables = build_callables(client)
    tools = []
    for spec in TOOL_SPECS:
        func = callables[spec["name"]]
        func.__name__ = spec["name"]
        func.__doc__ = spec["description"]
        tools.append(tool_decorator(spec["name"])(func))
    return tools
