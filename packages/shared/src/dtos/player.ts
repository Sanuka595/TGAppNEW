import { z } from 'zod';
import { CarSchema } from './car.js';

export const PlayerSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  balance: z.string(), // Decimal string
  fuel: z.number(),
  position: z.number().min(0).max(11),
  reputation: z.number(),
  garage: z.array(CarSchema).optional(),
  energy: z.number().min(0).max(3),
  energyRegenCounter: z.number().min(0).max(1),
});

export type Player = z.infer<typeof PlayerSchema>;
