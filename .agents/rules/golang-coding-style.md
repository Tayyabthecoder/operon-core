---
trigger: glob
globs: "**/*.go,**/go.mod,**/go.sum"
description: "Go Coding Style (applies to **/*.go, **/go.mod, **/go.sum)"
paths:
  - "**/*.go"
  - "**/go.mod"
  - "**/go.sum"
source: ecc-universal@2.2.3
---
# Go Coding Style

> This file extends [coding-standards.md](coding-standards.md) with Go specific content.

## Formatting

- **gofmt** and **goimports** are mandatory — no style debates

## Design Principles

- Accept interfaces, return structs
- Keep interfaces small (1-3 methods)

## Error Handling

Always wrap errors with context:

```go
if err != nil {
    return fmt.Errorf("failed to create user: %w", err)
}
```

## Reference

See skill: `golang-patterns` for comprehensive Go idioms and patterns.
