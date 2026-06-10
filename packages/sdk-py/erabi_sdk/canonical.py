"""RFC 8785 (JCS) canonical JSON, matching @erabi/crypto byte-for-byte.

Numbers follow ECMAScript Number→string semantics: shortest round-trip
digits, decimal notation for 1e-6 <= |x| < 1e21, exponential outside, no
zero-padded exponents. Values JSON cannot represent raise loudly.
"""

import json
import math
from decimal import Decimal
from typing import Any

__all__ = ["canonicalize", "format_number"]


def format_number(value: float) -> str:
    if isinstance(value, bool):  # guard: bools are not numbers here
        raise TypeError("bool passed to format_number")
    if math.isnan(value) or math.isinf(value):
        raise TypeError(f"canonicalize: non-finite number {value!r} is not valid JSON")
    if value == 0:
        return "0"

    negative = value < 0
    magnitude = abs(value)

    if 1e-6 <= magnitude < 1e21:
        # Decimal (positional) notation from shortest round-trip digits.
        if float(magnitude).is_integer():
            body = str(int(magnitude))
        else:
            body = format(Decimal(repr(magnitude)), "f")
            body = body.rstrip("0").rstrip(".") if "." in body else body
        return ("-" if negative else "") + body

    # Exponential notation: normalized mantissa, no zero-padded exponent.
    mantissa, _, exponent = repr(magnitude).partition("e")
    if not exponent:
        # repr produced positional form for an exponential-range value.
        dec = Decimal(repr(magnitude)).normalize()
        sign, digits, exp = dec.as_tuple()
        digit_str = "".join(str(d) for d in digits)
        e = exp + len(digit_str) - 1
        mantissa = digit_str[0] + ("." + digit_str[1:] if len(digit_str) > 1 else "")
        exponent = str(e)
    exp_int = int(exponent)
    mantissa = mantissa.rstrip("0").rstrip(".") if "." in mantissa else mantissa
    exp_str = f"e+{exp_int}" if exp_int >= 0 else f"e-{abs(exp_int)}"
    return ("-" if negative else "") + mantissa + exp_str


def _serialize(value: Any) -> str:
    if value is None:
        return "null"
    if value is True:
        return "true"
    if value is False:
        return "false"
    if isinstance(value, str):
        return json.dumps(value, ensure_ascii=False)
    if isinstance(value, int):
        return str(value)
    if isinstance(value, float):
        return format_number(value)
    if isinstance(value, (list, tuple)):
        return "[" + ",".join(_serialize(item) for item in value) + "]"
    if isinstance(value, dict):
        members = []
        # Sort by UTF-16 code units (RFC 8785 §3.2.3), not code points.
        for key in sorted(value.keys(), key=lambda k: k.encode("utf-16-be")):
            if not isinstance(key, str):
                raise TypeError("canonicalize: object keys must be strings")
            member = value[key]
            members.append(json.dumps(key, ensure_ascii=False) + ":" + _serialize(member))
        return "{" + ",".join(members) + "}"
    raise TypeError(f"canonicalize: cannot canonicalize value of type {type(value).__name__}")


def canonicalize(value: Any) -> str:
    return _serialize(value)
