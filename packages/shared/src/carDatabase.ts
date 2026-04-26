import { CarTier } from './types.js';

export interface CarModel {
  name: string;
  tier: CarTier;
  basePriceRange: [number, number];
}

export const CAR_MODELS_DB: CarModel[] = [
  // --- BUCKET ($800–$2,000) ---
  { name: 'Lada 2109',          tier: 'Bucket',  basePriceRange: [800,  1200] },
  { name: 'Daewoo Lanos',       tier: 'Bucket',  basePriceRange: [900,  1400] },
  { name: 'VW Golf Mk3',        tier: 'Bucket',  basePriceRange: [700,  1500] },
  { name: 'Opel Astra G',       tier: 'Bucket',  basePriceRange: [600,  1300] },
  { name: 'Ford Mondeo Mk2',    tier: 'Bucket',  basePriceRange: [700,  1600] },
  { name: 'BMW 3 Series E36',   tier: 'Bucket',  basePriceRange: [1000, 2000] },
  { name: 'Audi A4 B5',         tier: 'Bucket',  basePriceRange: [800,  1800] },

  // --- SCRAP ($3,000–$9,000) ---
  { name: 'BMW 5 Series E60',   tier: 'Scrap',   basePriceRange: [5000, 9000] },
  { name: 'Toyota Camry V40',   tier: 'Scrap',   basePriceRange: [4000, 8000] },
  { name: 'Audi A4 B8',         tier: 'Scrap',   basePriceRange: [4500, 8500] },
  { name: 'Skoda Octavia III',  tier: 'Scrap',   basePriceRange: [3000, 6000] },
  { name: 'VW Passat B7',       tier: 'Scrap',   basePriceRange: [3500, 7000] },
  { name: 'Mercedes E-Class W212', tier: 'Scrap', basePriceRange: [4000, 8000] },
  { name: 'Mitsubishi Lancer X', tier: 'Scrap',  basePriceRange: [3000, 6500] },

  // --- BUSINESS ($12,000–$22,000) ---
  { name: 'Toyota Camry V50',   tier: 'Business', basePriceRange: [13000, 18000] },
  { name: 'BMW 5 Series F10',   tier: 'Business', basePriceRange: [15000, 22000] },
  { name: 'Mazda 6 GJ',         tier: 'Business', basePriceRange: [12000, 16000] },
  { name: 'Mercedes E-Class W212 Restyling', tier: 'Business', basePriceRange: [16000, 22000] },
  { name: 'Skoda Superb II',    tier: 'Business', basePriceRange: [12000, 17000] },
  { name: 'Audi A6 C7',         tier: 'Business', basePriceRange: [14000, 20000] },

  // --- PREMIUM ($25,000–$60,000) ---
  { name: 'Porsche Cayenne 958', tier: 'Premium', basePriceRange: [30000, 50000] },
  { name: 'Mercedes S-Class W222', tier: 'Premium', basePriceRange: [35000, 55000] },
  { name: 'BMW M5 F10',         tier: 'Premium', basePriceRange: [28000, 45000] },
  { name: 'Range Rover Autobiography', tier: 'Premium', basePriceRange: [35000, 60000] },
  { name: 'Mercedes G-Class W463', tier: 'Premium', basePriceRange: [40000, 60000] },

  // --- RARITY ($40,000–$150,000) ---
  { name: 'Toyota Supra MK4',   tier: 'Rarity',  basePriceRange: [55000, 90000] },
  { name: 'Nissan Skyline GT-R R34', tier: 'Rarity', basePriceRange: [80000, 130000] },
  { name: 'BMW M3 E46',         tier: 'Rarity',  basePriceRange: [30000, 55000] },
  { name: 'Ferrari Testarossa', tier: 'Rarity',  basePriceRange: [100000, 145000] },
  { name: 'Mercedes 190E Evo II', tier: 'Rarity', basePriceRange: [90000, 130000] },
  { name: 'Porsche 911 (993)',   tier: 'Rarity',  basePriceRange: [65000, 110000] },
  { name: 'BMW M3 E30',         tier: 'Rarity',  basePriceRange: [40000, 70000] },
];
