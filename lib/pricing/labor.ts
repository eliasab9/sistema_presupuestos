import type { LaborPricing } from '@/types/budget';

// Labor pricing by HP
// Note: Prices in USD need to be divided by 0.65 and multiplied by exchange rate
// Actualización: bobinado y mantenimientos (motor / bomba / reductor) +30%.
// Balanceo y cambio de aceite quedaron sin cambios.
export const LABOR_PRICING: LaborPricing[] = [
  { powerHP: 0.25, motorNewUSD: 62, windingARS: 107015, motorMaintenanceARS: 35671, pumpMaintenanceARS: 53507, reducerMaintenanceARS: 71344, balancingARS: 169000, oilChangeARS: 52000 },
  { powerHP: 0.5, motorNewUSD: 79, windingARS: 135578, motorMaintenanceARS: 45192, pumpMaintenanceARS: 67790, reducerMaintenanceARS: 90386, balancingARS: 169000, oilChangeARS: 52000 },
  { powerHP: 0.75, motorNewUSD: 100, windingARS: 170919, motorMaintenanceARS: 56974, pumpMaintenanceARS: 85459, reducerMaintenanceARS: 113946, balancingARS: 169000, oilChangeARS: 52000 },
  { powerHP: 1, motorNewUSD: 107, windingARS: 181823, motorMaintenanceARS: 60609, pumpMaintenanceARS: 90912, reducerMaintenanceARS: 121216, balancingARS: 169000, oilChangeARS: 52000 },
  { powerHP: 1.5, motorNewUSD: 133, windingARS: 224669, motorMaintenanceARS: 74889, pumpMaintenanceARS: 112334, reducerMaintenanceARS: 149780, balancingARS: 169000, oilChangeARS: 52000 },
  { powerHP: 2, motorNewUSD: 159, windingARS: 268575, motorMaintenanceARS: 89525, pumpMaintenanceARS: 134287, reducerMaintenanceARS: 179049, balancingARS: 169000, oilChangeARS: 52000 },
  { powerHP: 3, motorNewUSD: 202, windingARS: 342323, motorMaintenanceARS: 114108, pumpMaintenanceARS: 171162, reducerMaintenanceARS: 228216, balancingARS: 169000, oilChangeARS: 52000 },
  { powerHP: 4, motorNewUSD: 231, windingARS: 391946, motorMaintenanceARS: 130649, pumpMaintenanceARS: 195972, reducerMaintenanceARS: 261297, balancingARS: 169000, oilChangeARS: 52000 },
  { powerHP: 5.5, motorNewUSD: 280, windingARS: 475319, motorMaintenanceARS: 158439, pumpMaintenanceARS: 237660, reducerMaintenanceARS: 316880, balancingARS: 169000, oilChangeARS: 52000 },
  { powerHP: 7.5, motorNewUSD: 365, windingARS: 621007, motorMaintenanceARS: 207003, pumpMaintenanceARS: 310504, reducerMaintenanceARS: 414006, balancingARS: 169000, oilChangeARS: 52000 },
  { powerHP: 10, motorNewUSD: 429, windingARS: 728993, motorMaintenanceARS: 242999, pumpMaintenanceARS: 364498, reducerMaintenanceARS: 485997, balancingARS: 169000, oilChangeARS: 52000 },
  { powerHP: 12.5, motorNewUSD: 498, windingARS: 844485, motorMaintenanceARS: 281496, pumpMaintenanceARS: 422243, reducerMaintenanceARS: 562990, balancingARS: 169000, oilChangeARS: 52000 },
  { powerHP: 15, motorNewUSD: 718, windingARS: 1219192, motorMaintenanceARS: 406398, pumpMaintenanceARS: 609595, reducerMaintenanceARS: 812794, balancingARS: 169000, oilChangeARS: 52000 },
  { powerHP: 20, motorNewUSD: 852, windingARS: 1445670, motorMaintenanceARS: 481891, pumpMaintenanceARS: 722835, reducerMaintenanceARS: 963780, balancingARS: 169000, oilChangeARS: 52000 },
  { powerHP: 25, motorNewUSD: 1097, windingARS: 1863862, motorMaintenanceARS: 621288, pumpMaintenanceARS: 931932, reducerMaintenanceARS: 1242574, balancingARS: 169000, oilChangeARS: 52000 },
  { powerHP: 30, motorNewUSD: 1208, windingARS: 2050785, motorMaintenanceARS: 683595, pumpMaintenanceARS: 1025392, reducerMaintenanceARS: 1367189, balancingARS: 169000, oilChangeARS: 52000 },
  { powerHP: 40, motorNewUSD: 1643, windingARS: 2791014, motorMaintenanceARS: 930339, pumpMaintenanceARS: 1395507, reducerMaintenanceARS: 1860677, balancingARS: 234000, oilChangeARS: 52000 },
  { powerHP: 50, motorNewUSD: 1999, windingARS: 3395245, motorMaintenanceARS: 1131749, pumpMaintenanceARS: 1697623, reducerMaintenanceARS: 2263498, balancingARS: 234000, oilChangeARS: 52000 },
  { powerHP: 60, motorNewUSD: 2226, windingARS: 3779489, motorMaintenanceARS: 1259829, pumpMaintenanceARS: 1889745, reducerMaintenanceARS: 2519659, balancingARS: 234000, oilChangeARS: 52000 },
  { powerHP: 75, motorNewUSD: 3186, windingARS: 5410469, motorMaintenanceARS: 1803490, pumpMaintenanceARS: 2705235, reducerMaintenanceARS: 3606980, balancingARS: 234000, oilChangeARS: 52000 },
  { powerHP: 100, motorNewUSD: 4141, windingARS: 7029906, motorMaintenanceARS: 2343302, pumpMaintenanceARS: 3514953, reducerMaintenanceARS: 4686605, balancingARS: 234000, oilChangeARS: 52000 },
  { powerHP: 125, motorNewUSD: 4598, windingARS: 7807176, motorMaintenanceARS: 2602392, pumpMaintenanceARS: 3903589, reducerMaintenanceARS: 5204784, balancingARS: 234000, oilChangeARS: 52000 },
  { powerHP: 150, motorNewUSD: 7354, windingARS: 12487704, motorMaintenanceARS: 4162568, pumpMaintenanceARS: 6243852, reducerMaintenanceARS: 8325136, balancingARS: 234000, oilChangeARS: 52000 },
  { powerHP: 180, motorNewUSD: 7895, windingARS: 13405717, motorMaintenanceARS: 4468573, pumpMaintenanceARS: 6702857, reducerMaintenanceARS: 8937144, balancingARS: 234000, oilChangeARS: 52000 },
  { powerHP: 220, motorNewUSD: 8438, windingARS: 14329029, motorMaintenanceARS: 4776342, pumpMaintenanceARS: 7164513, reducerMaintenanceARS: 9552686, balancingARS: 234000, oilChangeARS: 52000 },
];
