---
trigger: glob
globs: "**/*.py,**/*.pyi"
description: "Python Coding Style (applies to **/*.py, **/*.pyi)"
paths:
  - "**/*.py"
  - "**/*.pyi"
source: ecc-universal@2.2.3
---
# Python Coding Style

> This file extends [coding-standards.md](coding-standards.md) with Python specific content.

## Standards

- Follow **PEP 8** conventions
- Use **type annotations** on all function signatures

## Immutability

Prefer immutable data structures:

```python
from dataclasses import dataclass

@dataclass(frozen=True)
class User:
    name: str
    email: str

from typing import NamedTuple

class Point(NamedTuple):
    x: float
    y: float
```

## Formatting

- **black** for code formatting
- **isort** for import sorting
- **ruff** for linting

## Reference

See skill: `python-patterns` for comprehensive Python idioms and patterns.
