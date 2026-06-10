"""Framework bindings: thin wrappers over the Erabi SDK.

Each module exposes the same four operations (discover, intent,
report_outcome, my_reputation) in the shape its framework expects, without
importing the framework itself — the host application supplies it.
"""

from .tools import TOOL_SPECS, build_callables

__all__ = ["TOOL_SPECS", "build_callables"]
