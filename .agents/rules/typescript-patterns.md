---
trigger: glob
globs: "**/*.ts,**/*.tsx,**/*.js,**/*.jsx"
description: "TypeScript/JavaScript Patterns (applies to **/*.ts, **/*.tsx, **/*.js, **/*.jsx)"
paths:
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.js"
  - "**/*.jsx"
source: ecc-universal@2.2.3
---
# TypeScript/JavaScript Patterns

> This file extends [architecture.md](architecture.md) with TypeScript/JavaScript specific content.

## API Response Format

```typescript
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  meta?: {
    total: number
    page: number
    limit: number
  }
}
```

## Custom Hooks Pattern

```typescript
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(handler)
  }, [value, delay])

  return debouncedValue
}
```

## Repository Pattern

```typescript
interface Repository<T> {
  findAll(filters?: Filters): Promise<T[]>
  findById(id: string): Promise<T | null>
  create(data: CreateDto): Promise<T>
  update(id: string, data: UpdateDto): Promise<T>
  delete(id: string): Promise<void>
}
```
