import { z } from 'zod';

export const SeverityLevelSchema = z.enum(['Light', 'Medium', 'Serious', 'Critical']);
export const CarTierSchema = z.enum(['Bucket', 'Scrap', 'Business', 'Premium', 'Rarity']);
export const DefectCategorySchema = z.enum(['Engine', 'Electrical', 'Suspension', 'Body']);
export const LogTypeSchema = z.enum(['bot', 'system', 'debt', 'quest', 'success', 'error', 'info']);

export type SeverityLevel = z.infer<typeof SeverityLevelSchema>;
export type CarTier = z.infer<typeof CarTierSchema>;
export type DefectCategory = z.infer<typeof DefectCategorySchema>;
export type LogType = z.infer<typeof LogTypeSchema>;
