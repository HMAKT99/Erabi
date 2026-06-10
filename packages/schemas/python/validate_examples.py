"""Validate every example object against the generated Pydantic models.

Run from packages/schemas with PYTHONPATH=python:
    PYTHONPATH=python python3 python/validate_examples.py
"""

import json
import pathlib
import sys

import erabi_schemas.models as models
from pydantic import ValidationError

ROOT = pathlib.Path(__file__).resolve().parent.parent


def pascal(stem: str) -> str:
    return "".join(word.capitalize() for word in stem.split("-"))


def main() -> int:
    failures = 0
    examples = sorted((ROOT / "examples").glob("*.example.json"))
    if not examples:
        print("no examples found", file=sys.stderr)
        return 1

    for example_path in examples:
        stem = example_path.name.replace(".example.json", "")
        cls = getattr(models, pascal(stem), None)
        if cls is None:
            print(f"FAIL {stem}: no model named {pascal(stem)}", file=sys.stderr)
            failures += 1
            continue

        data = json.loads(example_path.read_text())
        try:
            cls.model_validate(data)
        except ValidationError as err:
            print(f"FAIL {stem}: {err}", file=sys.stderr)
            failures += 1
            continue

        # extra="forbid": unknown fields must be rejected
        try:
            cls.model_validate({**data, "evil_extra_field": 1})
        except ValidationError:
            print(f"ok   {stem}")
        else:
            print(f"FAIL {stem}: unknown field was accepted", file=sys.stderr)
            failures += 1

    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
