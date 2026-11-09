---
trigger: glob
globs: "**/*.java,**/pom.xml,**/build.gradle,**/build.gradle.kts"
description: "Java Hooks (applies to **/*.java, **/pom.xml, **/build.gradle, **/build.gradle.kts)"
paths:
  - "**/*.java"
  - "**/pom.xml"
  - "**/build.gradle"
  - "**/build.gradle.kts"
source: ecc-universal@2.2.3
---
# Java Hooks

> This file extends the host hook configuration (`.agents/hooks.json`, or `.claude/settings.json` under Claude Code) with Java-specific content.

## PostToolUse Hooks

Configure in `~/.claude/settings.json`:

- **google-java-format**: Auto-format `.java` files after edit
- **checkstyle**: Run style checks after editing Java files
- **./mvnw compile** or **./gradlew compileJava**: Verify compilation after changes
