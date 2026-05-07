import type { LaborPricing } from '@/types/budget';

// Labor pricing by HP
// Note: Prices in USD need to be divided by 0.65 and multiplied by exchange rate
export const LABOR_PRICING: LaborPricing[] = [
  { powerHP: 0.25, motorNewUSD: 48, windingARS: 63322, motorMaintenanceARS: 21107, pumpMaintenanceARS: 31661, reducerMaintenanceARS: 42215, balancingARS: 130000, oilChangeARS: 40000 },
  { powerHP: 0.5, motorNewUSD: 61, windingARS: 80224, motorMaintenanceARS: 26741, pumpMaintenanceARS: 40112, reducerMaintenanceARS: 53483, balancingARS: 130000, oilChangeARS: 40000 },
  { powerHP: 0.75, motorNewUSD: 77, windingARS: 101135, motorMaintenanceARS: 33712, pumpMaintenanceARS: 50568, reducerMaintenanceARS: 67424, balancingARS: 130000, oilChangeARS: 40000 },
  { powerHP: 1, motorNewUSD: 82, windingARS: 107588, motorMaintenanceARS: 35863, pumpMaintenanceARS: 53794, reducerMaintenanceARS: 71725, balancingARS: 130000, oilChangeARS: 40000 },
  { powerHP: 1.5, motorNewUSD: 102, windingARS: 132940, motorMaintenanceARS: 44313, pumpMaintenanceARS: 66470, reducerMaintenanceARS: 88627, balancingARS: 130000, oilChangeARS: 40000 },
  { powerHP: 2, motorNewUSD: 122, windingARS: 158920, motorMaintenanceARS: 52973, pumpMaintenanceARS: 79460, reducerMaintenanceARS: 105946, balancingARS: 130000, oilChangeARS: 40000 },
  { powerHP: 3, motorNewUSD: 155, windingARS: 202558, motorMaintenanceARS: 67519, pumpMaintenanceARS: 101279, reducerMaintenanceARS: 135039, balancingARS: 130000, oilChangeARS: 40000 },
  { powerHP: 4, motorNewUSD: 178, windingARS: 231921, motorMaintenanceARS: 77307, pumpMaintenanceARS: 115960, reducerMaintenanceARS: 154614, balancingARS: 130000, oilChangeARS: 40000 },
  { powerHP: 5.5, motorNewUSD: 215, windingARS: 281254, motorMaintenanceARS: 93751, pumpMaintenanceARS: 140627, reducerMaintenanceARS: 187503, balancingARS: 130000, oilChangeARS: 40000 },
  { powerHP: 7.5, motorNewUSD: 281, windingARS: 367460, motorMaintenanceARS: 122487, pumpMaintenanceARS: 183730, reducerMaintenanceARS: 244974, balancingARS: 130000, oilChangeARS: 40000 },
  { powerHP: 10, motorNewUSD: 330, windingARS: 431357, motorMaintenanceARS: 143786, pumpMaintenanceARS: 215679, reducerMaintenanceARS: 287572, balancingARS: 130000, oilChangeARS: 40000 },
  { powerHP: 12.5, motorNewUSD: 383, windingARS: 499695, motorMaintenanceARS: 166565, pumpMaintenanceARS: 249848, reducerMaintenanceARS: 333130, balancingARS: 130000, oilChangeARS: 40000 },
  { powerHP: 15, motorNewUSD: 552, windingARS: 721415, motorMaintenanceARS: 240472, pumpMaintenanceARS: 360707, reducerMaintenanceARS: 480943, balancingARS: 130000, oilChangeARS: 40000 },
  { powerHP: 20, motorNewUSD: 655, windingARS: 855426, motorMaintenanceARS: 285142, pumpMaintenanceARS: 427713, reducerMaintenanceARS: 570284, balancingARS: 130000, oilChangeARS: 40000 },
  { powerHP: 25, motorNewUSD: 844, windingARS: 1102877, motorMaintenanceARS: 367626, pumpMaintenanceARS: 551439, reducerMaintenanceARS: 735251, balancingARS: 130000, oilChangeARS: 40000 },
  { powerHP: 30, motorNewUSD: 929, windingARS: 1213482, motorMaintenanceARS: 404494, pumpMaintenanceARS: 606741, reducerMaintenanceARS: 808988, balancingARS: 130000, oilChangeARS: 40000 },
  { powerHP: 40, motorNewUSD: 1264, windingARS: 1651488, motorMaintenanceARS: 550496, pumpMaintenanceARS: 825744, reducerMaintenanceARS: 1100992, balancingARS: 180000, oilChangeARS: 40000 },
  { powerHP: 50, motorNewUSD: 1538, windingARS: 2009021, motorMaintenanceARS: 669674, pumpMaintenanceARS: 1004511, reducerMaintenanceARS: 1339348, balancingARS: 180000, oilChangeARS: 40000 },
  { powerHP: 60, motorNewUSD: 1712, windingARS: 2236384, motorMaintenanceARS: 745461, pumpMaintenanceARS: 1118192, reducerMaintenanceARS: 1490922, balancingARS: 180000, oilChangeARS: 40000 },
  { powerHP: 75, motorNewUSD: 2451, windingARS: 3201461, motorMaintenanceARS: 1067154, pumpMaintenanceARS: 1600731, reducerMaintenanceARS: 2134308, balancingARS: 180000, oilChangeARS: 40000 },
  { powerHP: 100, motorNewUSD: 3185, windingARS: 4159708, motorMaintenanceARS: 1386569, pumpMaintenanceARS: 2079854, reducerMaintenanceARS: 2773139, balancingARS: 180000, oilChangeARS: 40000 },
  { powerHP: 125, motorNewUSD: 3537, windingARS: 4619631, motorMaintenanceARS: 1539877, pumpMaintenanceARS: 2309816, reducerMaintenanceARS: 3079754, balancingARS: 180000, oilChangeARS: 40000 },
  { powerHP: 150, motorNewUSD: 5657, windingARS: 7389174, motorMaintenanceARS: 2463058, pumpMaintenanceARS: 3694587, reducerMaintenanceARS: 4926116, balancingARS: 180000, oilChangeARS: 40000 },
  { powerHP: 180, motorNewUSD: 6073, windingARS: 7932377, motorMaintenanceARS: 2644126, pumpMaintenanceARS: 3966188, reducerMaintenanceARS: 5288251, balancingARS: 180000, oilChangeARS: 40000 },
  { powerHP: 220, motorNewUSD: 6491, windingARS: 8478715, motorMaintenanceARS: 2826238, pumpMaintenanceARS: 4239357, reducerMaintenanceARS: 5652477, balancingARS: 180000, oilChangeARS: 40000 },
];
