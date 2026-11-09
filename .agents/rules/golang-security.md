---
trigger: glob
globs: "**/*.go,**/go.mod,**/go.sum"
description: "Go Security (applies to **/*.go, **/go.mod, **/go.sum)"
paths:
  - "**/*.go"
  - "**/go.mod"
  - "**/go.sum"
source: ecc-universal@2.2.3
---
# Go Security

> This file extends [security.md](security.md) with Go specific content.

## Secret Management

```go
apiKey := os.Getenv("OPENAI_API_KEY")
if apiKey == "" {
    log.Fatal("OPENAI_API_KEY not configured")
}
```

## Security Scanning

- Use **gosec** for static security analysis:
  ```bash
  gosec ./...
  ```

## Context & Timeouts

Always use `context.Context` for timeout control:

```go
ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
defer cancel()
```
