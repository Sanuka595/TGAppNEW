import { Decimal } from 'decimal.js';
import type { Car, CarTier, DefectInstance, GameNews, SeverityLevel } from './types.js';
import { HEALTH_PENALTIES } from './types.js';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Repair cost random ranges per defect severity (in dollars). */
export const SEVERITY_COST_RANGES: Record<SeverityLevel, [number, number]> = {
  Light:    [50,   200],
  Medium:   [200,  800],
  Serious:  [800,  3000],
  Critical: [3000, 10000],
};

/** Per-turn ownership tax per car tier (in dollars). */
export const OWNERSHIP_TAX_RATES: Record<CarTier, number> = {
  Bucket:   20,
  Scrap:    50,
  Business: 100,
  Premium:  150,
  Rarity:   300,
};

/**
 * Sell price multipliers by tier.
 * Rarity is special — uses deterministicMultiplier(car.id, 2, 4) instead.
 */
export const PROFIT_MARGINS: Record<CarTier, number> = {
  Bucket:   1.10,
  Scrap:    1.20,
  Business: 1.15,
  Premium:  1.15,
  Rarity:   1.0,
};

/** Rental income per car tier per turn (in dollars). */
export const RENT_INCOME: Record<CarTier, number> = {
  Bucket:   200,
  Business: 200,
  Scrap:    500,
  Premium:  1000,
  Rarity:   1000,
};

// ─── Utilities ────────────────────────────────────────────────────────────────

/**
 * Returns a deterministic float in [min, max) derived from a string seed via a
 * simple polynomial hash. Rarity cars always sell with the same multiplier for
 * a given car.id — players can plan P&L before buying.
 */
export function deterministicMultiplier(seed: string, min: number, max: number): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash * 31) + seed.charCodeAt(i)) >>> 0;
  }
  const t = (hash % 1000) / 1000;
  return min + t * (max - min);
}

// ─── Core business logic ──────────────────────────────────────────────────────

/**
 * Calculates car condition as a 0–100 score.
 * Each unrepaired defect subtracts HEALTH_PENALTIES[severity]. Clamped to [0, 100].
 */
export function calculateCarHealth(defects: DefectInstance[]): number {
  let health = 100;
  for (const defect of defects) {
    if (!defect.isRepaired) {
      health -= HEALTH_PENALTIES[defect.severity];
    }
  }
  return Math.max(0, health);
}

/** Applies active market news multipliers to a price. Returns price unchanged when no event is active. */
export function applyNewsEffects(price: Decimal, car: Car, activeNews?: GameNews | null): Decimal {
  if (activeNews == null) return price;
  let multiplier = new Decimal(1);
  const tierMult = activeNews.effects.tierMultipliers[car.tier];
  if (tierMult !== undefined) multiplier = multiplier.mul(tierMult);
  const modelMult = activeNews.effects.modelMultipliers[car.name];
  if (modelMult !== undefined) multiplier = multiplier.mul(modelMult);
  return price.mul(multiplier);
}

/**
 * Market purchase price for a car.
 *
 * Formula:
 *   basePrice → apply news → subtract (defect.repairCost × 1.2) per unrepaired defect → min $100
 *
 * The 1.2× penalty on defects reflects buyer risk (cost to repair + uncertainty).
 */
export function calculateCurrentMarketValue(car: Car, activeNews?: GameNews | null): Decimal {
  let value = new Decimal(car.basePrice);
  value = applyNewsEffects(value, car, activeNews);
  for (const defect of car.defects) {
    if (!defect.isRepaired) {
      value = value.sub(new Decimal(defect.repairCost).mul(1.2));
    }
  }
  return Decimal.max(new Decimal(100), value);
}

/**
 * Garage sale price for a car.
 *
 * Returns Decimal(0) if the car has an active legal_block defect — sale is prohibited.
 *
 * Formula:
 *   basePrice → apply news → subtract defect.repairCost per unrepaired defect (no risk multiplier)
 *   → apply tier profit margin (Rarity uses deterministicMultiplier(car.id, 2, 4))
 *   → Rarity bonus: +$5,000 if health=100 and all ≤2 defects are repaired
 *   → min $100
 */
export function calculateSellPrice(car: Car, activeNews?: GameNews | null): Decimal {
  const hasLegalBlock = car.defects.some(d => d.defectTypeId === 'legal_block' && !d.isRepaired);
  if (hasLegalBlock) return new Decimal(0);

  let value = new Decimal(car.basePrice);
  value = applyNewsEffects(value, car, activeNews);

  for (const defect of car.defects) {
    if (!defect.isRepaired) {
      value = value.sub(new Decimal(defect.repairCost));
    }
  }

  if (car.tier === 'Rarity') {
    const mult = deterministicMultiplier(car.id, 2, 4);
    value = value.mul(mult);
    const isPristine = car.defects.length <= 2 && car.defects.every(d => d.isRepaired);
    if (isPristine && car.health === 100) {
      value = value.add(5000);
    }
  } else {
    value = value.mul(PROFIT_MARGINS[car.tier]);
  }

  return Decimal.max(new Decimal(100), value);
}

/**
 * Total ownership tax per turn for all cars in a garage.
 * Deducted on each D6 roll.
 */
export function calculateOwnershipTax(garage: Car[]): Decimal {
  return garage.reduce((acc, car) => acc.add(OWNERSHIP_TAX_RATES[car.tier]), new Decimal(0));
}

/** Rental income for a single car on the rent cell. */
export function calculateRentIncome(tier: CarTier): Decimal {
  return new Decimal(RENT_INCOME[tier]);
}

/**
 * Generates a random repair cost for a new defect instance.
 * Always $2,000 for legal_block regardless of severity/tier.
 * Premium and Rarity cars pay 2× the base repair cost.
 */
export function generateRepairCost(
  severity: SeverityLevel,
  tier: CarTier,
  defectTypeId?: string,
): Decimal {
  if (defectTypeId === 'legal_block') return new Decimal(2000);
  const [min, max] = SEVERITY_COST_RANGES[severity];
  const base = min + Math.floor(Math.random() * (max - min + 1));
  return new Decimal(base).mul(tier === 'Premium' || tier === 'Rarity' ? 2 : 1);
}
