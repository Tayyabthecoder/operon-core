---
trigger: glob
globs: "**/*.swift,**/Package.swift"
description: "Swift Security (applies to **/*.swift, **/Package.swift)"
paths:
  - "**/*.swift"
  - "**/Package.swift"
source: ecc-universal@2.2.3
---
# Swift Security

> This file extends [security.md](security.md) with Swift specific content.

## Secret Management

- Use **Keychain Services** for sensitive data (tokens, passwords, keys) — never `UserDefaults`
- Use environment variables or `.xcconfig` files for build-time secrets
- Never hardcode secrets in source — decompilation tools extract them trivially

```swift
let apiKey = ProcessInfo.processInfo.environment["API_KEY"]
guard let apiKey, !apiKey.isEmpty else {
    fatalError("API_KEY not configured")
}
```

## Transport Security

- App Transport Security (ATS) is enforced by default — do not disable it
- Use certificate pinning for critical endpoints
- Validate all server certificates

## Input Validation

- Sanitize all user input before display to prevent injection
- Use `URL(string:)` with validation rather than force-unwrapping
- Validate data from external sources (APIs, deep links, pasteboard) before processing
