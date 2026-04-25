---
name: "BIZ:DEAL_ANALYZER"
description: "Handles business logic for parsing and analyzing deals (reselling)"
version: "1.0.0"
tags: ["business", "logic", "deals", "analytics"]
triggers: ["packages/server/src/services/analyzer"]
---

# BIZ:DEAL_ANALYZER

This skill provides instructions for the core business logic of the "Perekup" application.

## Core Instructions

1. **Market Scraping**: Define templates for parsing external platforms (API-based or headless browser if allowed).
2. **Profitability Formula**: `Profit = (MarketPrice * 0.9) - BuyingPrice - Logistics`.
3. **Risk Scoring**:
   - Low: Verified seller, common item.
   - Medium: New seller, niche item.
   - High: No history, suspicious price.
4. **Auto-matching**: Match user search requests with incoming deals in real-time.

## Data Structures

- `packages/shared/src/types/deals.ts`
- `packages/server/src/services/DealAnalysisService.ts`

## Example Logic

```typescript
export const calculateMargin = (buyPrice: number, sellPrice: number) => {
  const fees = sellPrice * 0.1; // 10% platform fee
  return sellPrice - buyPrice - fees;
};
```
