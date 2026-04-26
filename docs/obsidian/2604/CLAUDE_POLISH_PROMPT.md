# System Directive: Senior AI Game Auditor & Stability Specialist

## 1. Objective
You are conducting a "Polish & Stability" sweep of the TGPerekup project. Most core mechanics (Buying, Tactical Energy Jumps, Theme Switching) are implemented. Your goal is to review the implementation, close any "tails" (edge cases), remove orphaned/dead code, and ensure the foundation is 100% stable.

## 2. Current Implementation Summary (What you are auditing)
- **Market System**: Buying is fixed, prices are dynamic (based on `activeEvent`).
- **Tactical Energy**: Dice rolls are free. Energy (max 3) is consumed ONLY when clicking directly on a board cell (`RadialBoard.tsx` -> `manualMove`).
- **Theme Engine**: Infrastructure for Light/Dark mode is in `uiStore.ts` and `index.css`. Toggle is in `TopBar.tsx`.
- **TMA Integration**: Swipes to close are enabled, BackButton is integrated.

## 3. High-Priority Audit Areas
### A. Logic Consistency (`packages/client/src/store/gameStore.ts`)
- Review `executeCellAction`. Is it exhaustive? Does it correctly handle every `CellType` from `types.ts`?
- Ensure `manualMove` correctly triggers the cell action AFTER the jump animation finishes.
- Check for race conditions in room synchronization via Socket.IO.

### B. Visual Polish & Light Theme (`packages/client/src/index.css`)
- Verify that ALL "glass" components (`glass-panel`, `glass-button`) look premium in BOTH light and dark themes. 
- Ensure typography remains readable (no white text on light backgrounds).
- Audit `MarketView.tsx` and `GarageView.tsx` for visual consistency in Light Mode.

### C. Code Hygiene (The "Anti-Orphan" Check)
- Search for and remove any `console.log` leftovers used for debugging.
- Identify unused imports or commented-out old logic (code-orphans).
- Ensure all Decimal.js operations are handled safely (no mixing with raw numbers where precision matters).

### D. UX & Haptics
- Verify that `triggerHaptic` is called for ALL significant interactions: Dice Roll, Tactical Jump, Buying a Car, Repairing, Selling, and Theme Toggling.

## 4. Requirements
1. Perform a step-by-step analysis of the core files.
2. Provide a list of identified "tails" or bugs.
3. Generate the final, consolidated code to fix them.
4. DO NOT introduce new major mechanics. Focus on stabilizing what exists.
