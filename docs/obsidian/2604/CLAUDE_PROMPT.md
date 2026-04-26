# System Directive: Senior AI Game Architect (TGPerekup Stability & Mechanics)

## 1. Context & Task
You are tasked with stabilizing and expanding the core mechanics of "TGPerekup" (Telegram Mini App). The project is a Monorepo (Node.js/TypeScript/Vite/Tailwind). We have established a "Genetic Design Code" (Premium Glassmorphism 2.0), but current implementation has critical bugs and missing core loops.

## 2. Immediate Critical Fixes (The "Hammer" Phase)
- **MarketView Bug**: The "Buy" (Выкупить) button in `packages/client/src/components/game/MarketView.tsx` has NO `onClick` handler. Bind it to `buyCar(car.id)` from `useGameStore`.
- **Logic Sync**: Ensure `calculateCurrentMarketValue` in `MarketView` receives `activeEvent` from the store to make prices dynamic.

## 3. Core Mechanic Implementation: Energy & Tactical Jump
- **Energy System (Tactical Tool)**: Energy is NOT required for normal dice rolls. Normal rolls are free.
    - Energy is a "joker" resource (max 3, slow regen).
    - If a player has >0 Energy and it's their turn, they can CLICK ON ANY CELL on the board to perform a "Tactical Jump".
    - The `manualMove` function in `gameStore` handles this by calculating the distance and setting the player's position, consuming 1 Energy.
    - Implement background energy regeneration (e.g., 1 unit every 30 minutes) using `energyRegenCounter` in `gameStore.ts`.
- **State Integrity**: Update `executeCellAction` in `gameStore.ts` to ensure it handles all cell types correctly according to `types.ts` (Repair, Rent, Sale, News, etc.).

## 4. Architectural Expansion: Light Theme & Customization
- **Design System**: Add "Light Theme" support.
    - Update `uiStore.ts` to include `theme: 'light' | 'dark'`.
    - Update `index.css` to use CSS Variables for core colors (Midnight, Glass-BG, etc.) that swap based on the `.light` class on the `<html>` or `<body>` tag.
    - Ensure "Light Theme" maintains the premium/glassy aesthetic (use translucent whites instead of deep blues).

## 5. Content Filling
- **Car Database**: Ensure the logic for spawning cars based on cell types (`buy_bucket`, `buy_scrap`, etc.) is robust.
- **Defects**: Review the defect generation in `businessLogic.ts` to ensure variety and correct health calculation.

## 6. Stability Requirements
- **TypeScript**: No `any`. Strict types only.
- **Zod**: Use Zod for any DTO validation if applicable.
- **Haptics**: Ensure every major action (Buy, Sell, Dice Roll) triggers `triggerHaptic` from `useTelegram`.

## 7. Output Format
Provide a complete implementation plan followed by the code for affected files. Do not refactor global architecture unless necessary for stability. Focus on "Rolling over" bugs like a steamroller.
