---
name: "ZOD:DTO_SYNCER"
description: "Synchronizes Zod schemas and TypeScript types across the Monorepo"
version: "1.0.0"
tags: ["zod", "dto", "monorepo", "typesafety"]
triggers: ["packages/shared/src/dtos", "packages/server/src/controllers"]
---

# ZOD:DTO_SYNCER

This skill ensures that Data Transfer Objects (DTOs) are consistent between the backend and frontend.

## Core Instructions

1. **Source of Truth**: All DTOs must be defined in `packages/shared/src/dtos/` using Zod.
2. **Type Inference**: Use `z.infer<typeof schema>` to export types.
3. **Naming Convention**: Schemas should end in `Schema` (e.g., `UserSchema`), and types should be the base name (e.g., `User`).
4. **Validation**: Use Zod schemas in `packages/server` for request body validation and in `packages/client` for response parsing.

## Directory Structure

- `packages/shared/src/dtos/auth.ts`
- `packages/shared/src/dtos/deals.ts`
- `packages/shared/src/dtos/user.ts`

## Example

```typescript
import { z } from 'zod';

export const DealSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(3),
  price: z.number().positive(),
  status: z.enum(['pending', 'active', 'sold']),
});

export type Deal = z.infer<typeof DealSchema>;
```
