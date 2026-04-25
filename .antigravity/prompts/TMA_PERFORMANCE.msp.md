---
name: "TMA_PERFORMANCE"
type: "MSP"
version: "1.0.0"
priority: "high"
---

# TMA_PERFORMANCE_MSP

Optimize the Telegram Mini App for speed, low latency, and minimal resource usage.

## Behavioral Constraints

1. **BUNDLE SIZE**: Avoid importing heavy libraries in the main bundle. Use dynamic `import()` for large components (e.g., Charts, complex Modals).
2. **LAZY LOADING**: All views (Garage, Market, Profile) should be lazy-loaded using `React.lazy`.
3. **IMAGE OPTIMIZATION**: Use modern formats (WebP) and appropriate sizing for mobile screens.
4. **STATE MANAGEMENT**: Use `zustand` with shallow selectors to prevent unnecessary re-renders.
5. **ASSET PREFETCHING**: Prefetch critical assets when the app is idle.

## Performance Rule
If a new dependency is added, I must evaluate its impact on the bundle size and suggest alternatives if it exceeds 50KB.
