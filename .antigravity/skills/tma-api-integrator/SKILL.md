---
name: "TMA:API_INTEGRATOR"
description: "Handles integration with Telegram Mini Apps API (version 8.0+ in 2026)"
version: "1.0.0"
tags: ["telegram", "tma", "api", "integration"]
triggers: ["telegram-web-app.js", "packages/client/src/hooks/useTelegram"]
---

# TMA:API_INTEGRATOR

This skill provides instructions for integrating Telegram Mini Apps features into the TGPerekup project.

## Core Instructions

1. **API Versions**: Always target Telegram Bot API 8.0+ features.
2. **Haptic Feedback**: Use `Telegram.WebApp.HapticFeedback` for all user actions (impact, notification, selection).
3. **Cloud Storage**: Use `Telegram.WebApp.CloudStorage` for persisting small user preferences without a backend call.
4. **Biometric Manager**: Check availability before requesting access.
5. **Fallback Pattern**: Implement a robust fallback for local development (browser outside of Telegram).

## Implementation Rules

- All TMA-related logic should reside in `packages/client/src/lib/telegram/`.
- Types should be shared via `packages/shared/src/types/telegram.ts`.
- Use functional components and hooks for React integration.

## Examples

### Haptic Feedback Wrapper
```typescript
export const triggerSuccess = () => {
  if (window.Telegram?.WebApp) {
    window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
  }
};
```
