---
name: "STRICT:VALIDATOR"
description: "Ensures code quality and adherence to project standards"
version: "1.0.0"
tags: ["quality", "lint", "test", "standards"]
triggers: ["commit", "push", "npm-run-typecheck"]
---

# STRICT:VALIDATOR

This skill enforces strict development standards to maintain a clean and reliable codebase.

## Core Instructions

1. **No `any`**: The use of `any` is strictly prohibited. Use `unknown` or specific interfaces.
2. **SOLID Principles**: Always verify that new classes or functions follow SOLID.
3. **Type Checking**: Run `npm run typecheck` after every logic change.
4. **Linting**: Ensure `npm run lint:fix` is executed before finalizing any task.
5. **Testing**: Run tests for the specific package modified (`npm run test --workspace=packages/...`).

## Checklist for Task Completion

- [ ] Does the code match the `ZOD:DTO_SYNCER` standards?
- [ ] Are all exports documented with JSDoc?
- [ ] Did I run `typecheck` and `lint`?
- [ ] Is there any `any` left in the code?
- [ ] If UI changed, does it follow `UI:PREMIUM_GLASS`?

## Automated Verification

If I (the agent) am finishing a task, I must report the status of these checks.
