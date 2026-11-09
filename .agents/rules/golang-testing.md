---
trigger: glob
globs: "**/*.go,**/go.mod,**/go.sum"
description: "Go Testing (applies to **/*.go, **/go.mod, **/go.sum)"
paths:
  - "**/*.go"
  - "**/go.mod"
  - "**/go.sum"
source: ecc-universal@2.2.3
---
# Go Testing

> This file extends [testing.md](testing.md) with Go specific content.

## Framework

Use the standard `go test` with **table-driven tests**.

## Race Detection

Always run with the `-race` flag:

```bash
go test -race ./...
```

## Coverage

```bash
go test -cover ./...
```

## Reference

See skill: `golang-testing` for detailed Go testing patterns and helpers.
