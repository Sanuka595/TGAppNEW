import { Decimal } from 'decimal.js';
import type { Car, CarTier, CellType, DefectInstance, GameNews, SeverityLevel } from './types.js';
import { HEALTH_PENALTIES } from './types.js';
import type { MarketStats } from './dtos/room.js';
import type { Player } from './dtos/player.js';
import { DIAGNOSTICS_UNLOCK_THRESHOLD } from './constants.js';

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

import { CAR_MODELS_DB } from './carDatabase.js';
import { DEFECTS_DB } from './defectDatabase.js';

// ─── Race ─────────────────────────────────────────────────────────────────────

/**
 * D6 roll bonus applied per car tier in race duels.
 * Shared between server (authoritative resolve) and client (preview display).
 */
export const TIER_RACE_BONUS: Record<CarTier, number> = {
  Bucket: -1, Scrap: 0, Business: 0, Premium: 1, Rarity: 2,
};

/**
 * Tier-based win probability multipliers for solo (vs-bot) races.
 * Combined with car health: winChance = (health / 100) * multiplier.
 */
export const SOLO_RACE_TIER_MULTIPLIERS: Record<CarTier, number> = {
  Bucket: 0.5, Scrap: 0.7, Business: 1.0, Premium: 1.3, Rarity: 1.6,
};

/**
 * Calculates the win probability for a solo (vs-bot) race.
 * Result is in [0, 1] — compare against Math.random() to resolve.
 */
export function calculateSoloRaceWinChance(car: Car): number {
  return (car.health / 100) * SOLO_RACE_TIER_MULTIPLIERS[car.tier];
}

// ─── Market generation ────────────────────────────────────────────────────────

/**
 * Generates a fresh market lot for a given board cell type.
 * Returns an empty array for non-buy cells.
 */
export function generateMarketForCell(cellType: CellType): Car[] {
  const ALL_TIERS: CarTier[] = ['Bucket', 'Scrap', 'Business', 'Premium', 'Rarity'];
  switch (cellType) {
    case 'buy_bucket':
      return Array.from({ length: 3 }, () => generateCar('Bucket'));
    case 'buy_scrap':
      return Array.from({ length: 3 }, () => generateCar('Scrap'));
    case 'buy_business':
      return Array.from({ length: 3 }, () => generateCar('Business'));
    case 'buy_premium':
      return Array.from({ length: 2 }, () => generateCar('Premium'));
    case 'buy_retro':
      return [generateCar('Rarity')];
    case 'buy_random': {
      const pick = (): CarTier => ALL_TIERS[Math.floor(Math.random() * ALL_TIERS.length)]!;
      return Array.from({ length: 3 }, () => generateCar(pick()));
    }
    default:
      return [];
  }
}

// ─── Progression unlocks ─────────────────────────────────────────────────────

/**
 * Returns true when the player has earned enough to use Diagnostics.
 * Based on totalEarned (cumulative, never decreases) — not current balance.
 */
export function canUseDiagnostics(player: Player): boolean {
  return new Decimal(player.totalEarned ?? '0').gte(DIAGNOSTICS_UNLOCK_THRESHOLD);
}

// ─── Smart Event Director ─────────────────────────────────────────────────────

import { NEWS_DB } from './newsDatabase.js';

/**
 * Selects a weighted-random news event based on current market activity.
 * When stats is null (solo mode with no tracking), falls back to uniform random.
 *
 * Weight rules (base weight = 100 per event):
 *   scrap_utilization   +400 if nobody bought Scrap this session
 *   luxury_deficit      +300 if 3+ Premium cars bought
 *   tax_luxury          +250 if 3+ Premium bought (competing with deficit)
 *   taxi_boom           +200 if 2+ Business bought
 *   retro_hype          +250 if any Rarity bought
 *   racing_fever        +300 if 2+ races won
 *   gai_raid            +200 if 4+ Bucket bought
 *   repair_season       +150 if 5+ repairs done
 *   fuel_crisis         +200 if 3+ Bucket bought
 */
export function selectWeightedNews(stats: MarketStats | null): GameNews {
  if (NEWS_DB.length === 0) throw new Error('NEWS_DB is empty');
  if (!stats) return NEWS_DB[Math.floor(Math.random() * NEWS_DB.length)]!;

  const weights = NEWS_DB.map((news) => {
    let w = 100;
    const { boughtByTier, repairsDone, racesWon } = stats;

    switch (news.id) {
      case 'scrap_utilization': if ((boughtByTier.Scrap ?? 0) === 0)           w += 400; break;
      case 'luxury_deficit':    if ((boughtByTier.Premium ?? 0) >= 3)          w += 300; break;
      case 'tax_luxury':        if ((boughtByTier.Premium ?? 0) >= 3)          w += 250; break;
      case 'taxi_boom':         if ((boughtByTier.Business ?? 0) >= 2)         w += 200; break;
      case 'retro_hype':        if ((boughtByTier.Rarity ?? 0) >= 1)           w += 250; break;
      case 'racing_fever':      if (racesWon >= 2)                              w += 300; break;
      case 'gai_raid':          if ((boughtByTier.Bucket ?? 0) >= 4)           w += 200; break;
      case 'repair_season':     if (repairsDone >= 5)                          w += 150; break;
      case 'fuel_crisis':       if ((boughtByTier.Bucket ?? 0) >= 3)           w += 200; break;
    }
    return w;
  });

  const total = weights.reduce((a, b) => a + b, 0);
  let roll = Math.random() * total;
  for (let i = 0; i < NEWS_DB.length; i++) {
    roll -= weights[i]!;
    if (roll <= 0) return NEWS_DB[i]!;
  }
  return NEWS_DB[NEWS_DB.length - 1]!;
}

// ─── Random encounter ─────────────────────────────────────────────────────────

export type RandomEncounter =
  | { type: 'fine'; amount: number }
  | { type: 'bonus'; amount: number };

/**
 * Rolls a 15% chance random road encounter (traffic police fine or lucky bonus).
 * Returns null when no encounter occurs.
 */
export function resolveRandomEncounter(): RandomEncounter | null {
  if (Math.random() >= 0.15) return null;
  const isBad = Math.random() > 0.5;
  return isBad
    ? { type: 'fine',  amount: 100 + Math.floor(Math.random() * 200) }
    : { type: 'bonus', amount: 50  + Math.floor(Math.random() * 150) };
}

/**
 * Generates a random integer in [min, max].
 */
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Randomly picks N unique elements from an array.
 */
function pickRandomN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, n);
}

/**
 * Generates a full Car object with defects based on the tier.
 * Follows doc specs for defect counts and hidden flags.
 */
export function generateCar(tier: CarTier, forcedModel?: string): Car {
  const models = forcedModel 
    ? CAR_MODELS_DB.filter(m => m.name === forcedModel)
    : CAR_MODELS_DB.filter(m => m.tier === tier);
    
  if (models.length === 0) {
    throw new Error(`No car models found for tier ${tier}`);
  }

  const model = models[randomInt(0, models.length - 1)]!;
  const basePrice = randomInt(model.basePriceRange[0], model.basePriceRange[1]);
  
  // Defect counts by tier (from doc)
  let defectCount = 0;
  let isHiddenDefault = false;
  
  switch(tier) {
    case 'Bucket':   defectCount = 1; break;
    case 'Scrap':    defectCount = randomInt(2, 4); break;
    case 'Business': defectCount = randomInt(1, 2); break;
    case 'Premium':  defectCount = randomInt(0, 1); isHiddenDefault = true; break;
    case 'Rarity':   defectCount = 2; isHiddenDefault = true; break;
  }

  const makeDefect = (dt: { id: string; name: string; severity: DefectInstance['severity'] }): DefectInstance => ({
    id: Math.random().toString(36).substring(2, 9),
    defectTypeId: dt.id,
    name: dt.name,
    severity: dt.severity,
    repairCost: generateRepairCost(dt.severity, tier, dt.id).toString(),
    isRepaired: false,
    isHidden: isHiddenDefault,
  });

  // Forced defects are always present (signature of special models).
  const forcedDefects: DefectInstance[] = (model.forcedDefectIds ?? [])
    .map(id => DEFECTS_DB.find(d => d.id === id))
    .filter((d): d is typeof DEFECTS_DB[number] => d !== undefined)
    .map(makeDefect);

  // Random defects, excluding forced ones to avoid duplicates.
  const forcedIds = new Set(model.forcedDefectIds ?? []);
  const eligiblePool = DEFECTS_DB.filter(d => !forcedIds.has(d.id) && d.id !== 'legal_block');
  const randomDefects: DefectInstance[] = pickRandomN(eligiblePool, defectCount).map(makeDefect);

  const defects = [...forcedDefects, ...randomDefects];
  const health = calculateCarHealth(defects);

  return {
    id: Math.random().toString(36).substring(2, 15),
    name: model.name,
    tier,
    basePrice: basePrice.toString(),
    health,
    defects,
    history: [],
    isLocked: false,
    isRented: false,
    boughtFor: '0',
    imageId: model.imageId,
  };
}
