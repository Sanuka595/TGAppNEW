---
name: "UI:PREMIUM_GLASS"
description: "Applies high-end Glassmorphism 2.0 design tokens and components"
version: "1.0.0"
tags: ["ui", "design", "css", "glassmorphism"]
triggers: ["packages/client/src/styles", ".css"]
---

# UI:PREMIUM_GLASS

This skill enforces the "Rich Aesthetics" requirement for the TGPerekup interface.

## Design Principles

1. **Glassmorphism**: Use `backdrop-filter: blur(20px)` and semi-transparent backgrounds.
2. **Dynamic Colors**: Use vibrant gradients (HSL tailored) that react to user interaction.
3. **Typography**: Use modern sans-serif (Inter, Outfit) with proper weight distribution.
4. **Micro-animations**: Apply subtle hover transitions (0.2s ease-out) and spring animations for modals.

## Core CSS Variables

```css
:root {
  --glass-bg: rgba(255, 255, 255, 0.1);
  --glass-border: rgba(255, 255, 255, 0.2);
  --accent-gradient: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
  --blur-amount: 20px;
}
```

## Component Requirements

- **Cards**: Must have a thin 1px border and a subtle drop shadow.
- **Buttons**: Should use the accent gradient with a "lift" effect on hover.
- **Modals**: Must slide in from the bottom (mobile-first) with a dark background overlay.
