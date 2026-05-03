import { z } from 'zod';
import { SeverityLevelSchema, CarTierSchema } from './common.js';

export const DefectInstanceSchema = z.object({
  id: z.string(),
  defectTypeId: z.string(),
  name: z.string(),
  severity: SeverityLevelSchema,
  isHidden: z.boolean(),
  repairCost: z.string(), // Decimal string
  isRepaired: z.boolean(),
});

export const CarHistoryEntrySchema = z.object({
  timestamp: z.number(),
  event: z.enum(['acquired', 'repaired', 'diagnosed', 'rented', 'defect_revealed', 'sold']),
  description: z.string(),
  amount: z.string().optional(),
  actorId: z.string().optional(),
});

export const CarSchema = z.object({
  id: z.string(),
  name: z.string(),
  tier: CarTierSchema,
  basePrice: z.string(),
  defects: z.array(DefectInstanceSchema),
  history: z.array(z.string()),
  health: z.number().min(0).max(100),
  isRented: z.boolean().optional(),
  isLocked: z.boolean().optional(),
  boughtFor: z.string().optional(),
  mileage: z.number().optional(),
  auditLog: z.array(CarHistoryEntrySchema).optional(),
  /** Asset identifier for the visual card (e.g. 'zil_600'). Resolves to /assets/cars/{imageId}.svg */
  imageId: z.string().optional(),
});

export type DefectInstance = z.infer<typeof DefectInstanceSchema>;
export type CarHistoryEntry = z.infer<typeof CarHistoryEntrySchema>;
export type Car = z.infer<typeof CarSchema>;
