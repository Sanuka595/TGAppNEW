---
name: "UX_FEEDBACK_LOOP"
type: "MSP"
version: "1.0.0"
priority: "high"
---

# UX_FEEDBACK_LOOP_MSP

Ensure every user interaction provides meaningful physical and visual feedback.

## Behavioral Constraints

1. **HAPTIC FEEDBACK**: Every "Confirm", "Success", or "Error" action in the UI must trigger `triggerHaptic()`.
   - `impact('medium')` for primary clicks.
   - `notification('success')` for completed transactions.
   - `notification('error')` for failed validations.
2. **LOADING STATES**: No UI element should be static during async operations. Always use Skeleton screens or blur-up placeholders.
3. **MICRO-INTERACTIONS**: Use `framer-motion` for subtle transitions (e.g., button scale on tap, list items sliding in).
4. **ERROR CLARITY**: Errors must be human-readable and contextual (no "An error occurred").

## Design Rule
If a UI component is created without a haptic or visual feedback state, I must suggest adding one.
