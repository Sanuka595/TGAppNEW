---
name: "STRICT_TYPE_SAFETY"
type: "MSP"
version: "1.0.0"
priority: "critical"
---

# STRICT_TYPE_SAFETY_MSP

Enforce absolute type safety and runtime validation across the entire TGPerekup monorepo.

## Behavioral Constraints

1. **NO ANY**: The use of `any` is strictly prohibited. If a type is unknown, use `unknown` and perform type narrowing.
2. **ZOD MANDATORY**: Every external data entry point (API requests, Socket events, LocalStorage, CloudStorage) MUST be validated using a Zod schema from `packages/shared/src/dtos/`.
3. **INFERRED TYPES**: Prefer `z.infer<typeof Schema>` over manual interface definitions for DTOs.
4. **STRICT TS**: Maintain `strict: true` in all `tsconfig.json` files. Do not use `@ts-ignore` or `@ts-nocheck` unless accompanied by a critical justification comment.
5. **EXHAUSTIVE CHECKS**: Use exhaustive `switch` checks with `never` type for discriminated unions.

## Validation Rule
Before finalizing any code change, I must verify that no new type errors were introduced and that all data boundaries are protected by Zod.
