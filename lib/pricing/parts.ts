import type { CapacitorPricing, MotorPartPricing } from '@/types/budget';

// USD pricing factor: divide USD prices by this to get final price
export const USD_FACTOR = 0.65;

// Ceramic/Carbon/Nitrile seal — compact form, all diameters 12–30 mm
export const CERAMIC_SEAL_COMPACT_PRICE_USD = 13.00;

// Capacitor pricing in USD
export const CAPACITOR_PRICING: CapacitorPricing[] = [
  { microfarads: 10,   priceUSD: 10.00 },
  { microfarads: 12.5, priceUSD: 10.00 },
  { microfarads: 16,   priceUSD: 10.00 },
  { microfarads: 20,   priceUSD: 10.00 },
  { microfarads: 25,   priceUSD: 10.00 },
  { microfarads: 30,   priceUSD: 10.00 },
];

// Shaft filling prices (Rellenado de eje)
export const SHAFT_FILLING_PRICING = [
  { diameter: 12,  bearing: '6201', priceARS: 30800, priceUSD: 22 },
  { diameter: 15,  bearing: '6202', priceARS: 30800, priceUSD: 30 },
  { diameter: 20,  bearing: '6204', priceARS: 25000, priceUSD: 25 },
  { diameter: 25,  bearing: '6205', priceARS: 25000, priceUSD: 25 },
  { diameter: 30,  bearing: '6206', priceARS: 25000, priceUSD: 25 },
  { diameter: 40,  bearing: '6208', priceARS: 30000, priceUSD: 30 },
  { diameter: 45,  bearing: '6209', priceARS: 30000, priceUSD: 30 },
  { diameter: 50,  bearing: '6210', priceARS: 30000, priceUSD: 30 },
  { diameter: 55,  bearing: '6211', priceARS: 40000, priceUSD: 40 },
  { diameter: 60,  bearing: '6212', priceARS: 40000, priceUSD: 40 },
  { diameter: 65,  bearing: '6213', priceARS: 40000, priceUSD: 40 },
  { diameter: 70,  bearing: '6214', priceARS: 60000, priceUSD: 59 },
  { diameter: 80,  bearing: '6216', priceARS: 60000, priceUSD: 59 },
  { diameter: 90,  bearing: '6218', priceARS: 60000, priceUSD: 59 },
  { diameter: 120, bearing: '6224', priceARS: 90000, priceUSD: 89 },
  { diameter: 130, bearing: '6226', priceARS: 90000, priceUSD: 89 },
];

// Cover sleeve prices (Encamisado tapas)
export const COVER_SLEEVE_PRICING = [
  { diameter: 32,  bearing: '6201', priceARS: 24000,  priceUSD: 24  },
  { diameter: 35,  bearing: '6202', priceARS: 24000,  priceUSD: 24  },
  { diameter: 47,  bearing: '6204', priceARS: 27000,  priceUSD: 27  },
  { diameter: 52,  bearing: '6205', priceARS: 29000,  priceUSD: 29  },
  { diameter: 62,  bearing: '6206', priceARS: 34000,  priceUSD: 34  },
  { diameter: 80,  bearing: '6208', priceARS: 40000,  priceUSD: 40  },
  { diameter: 85,  bearing: '6209', priceARS: 45000,  priceUSD: 49  },
  { diameter: 90,  bearing: '6210', priceARS: 50000,  priceUSD: 49  },
  { diameter: 100, bearing: '6211', priceARS: 55000,  priceUSD: 54  },
  { diameter: 110, bearing: '6212', priceARS: 60000,  priceUSD: 59  },
  { diameter: 120, bearing: '6213', priceARS: 65000,  priceUSD: 64  },
  { diameter: 125, bearing: '6214', priceARS: 68000,  priceUSD: 67  },
  { diameter: 140, bearing: '6216', priceARS: 75000,  priceUSD: 74  },
  { diameter: 160, bearing: '6218', priceARS: 80000,  priceUSD: 79  },
  { diameter: 215, bearing: '6224', priceARS: 100000, priceUSD: 99  },
  { diameter: 230, bearing: '6226', priceARS: 120000, priceUSD: 119 },
];

// Motor parts: fan covers, rear covers, fans — prices in USD
export const MOTOR_PARTS_PRICING: MotorPartPricing[] = [
  // Fan covers (Cubre ventilador)
  { description: 'Cubre ventilador para motor "TEM"', carcasa: '063', priceUSD: 3.18 },
  { description: 'Cubre ventilador para motor "TEM"', carcasa: '071', priceUSD: 3.45 },
  { description: 'Cubre ventilador para motor "TEM"', carcasa: '080', priceUSD: 4.27 },
  { description: 'Cubre ventilador para motor "TEM"', carcasa: '090', priceUSD: 5.43 },
  { description: 'Cubre ventilador para motor "TEM"', carcasa: '100', priceUSD: 6.46 },
  { description: 'Cubre ventilador para motor "TEM"', carcasa: '112', priceUSD: 8.49 },
  { description: 'Cubre ventilador para motor "TEM"', carcasa: '132', priceUSD: 10.92 },
  { description: 'Cubre ventilador para motor "TEM"', carcasa: '160', priceUSD: 21.08 },
  { description: 'Cubre ventilador para motor "TEM"', carcasa: '180', priceUSD: 28.5 },
  { description: 'Cubre ventilador para motor "TEM"', carcasa: '200', priceUSD: 41.12 },
  { description: 'Cubre ventilador para motor "TEM"', carcasa: '225', priceUSD: 58.15 },
  { description: 'Cubre ventilador para motor "TEM"', carcasa: '250', priceUSD: 77.25 },
  { description: 'Cubre ventilador para motor "TEM"', carcasa: '280', priceUSD: 90.19 },
  { description: 'Cubre ventilador para motor "TEM"', carcasa: '315', priceUSD: 136.47 },
  // Rear covers (Tapa trasera)
  { description: 'Tapa trasera para motor "TEM"', carcasa: '056', priceUSD: 3.46 },
  { description: 'Tapa trasera para motor "TEM"', carcasa: '063', priceUSD: 5.5 },
  { description: 'Tapa trasera para motor "TEM"', carcasa: '071', priceUSD: 7.49 },
  { description: 'Tapa trasera para motor "TEM"', carcasa: '080', priceUSD: 11.36 },
  { description: 'Tapa trasera para motor "TEM"', carcasa: '090', priceUSD: 12.89 },
  { description: 'Tapa trasera para motor "TEM"', carcasa: '100', priceUSD: 20.12 },
  { description: 'Tapa trasera para motor "TEM"', carcasa: '112', priceUSD: 29.13 },
  { description: 'Tapa trasera para motor "TEM"', carcasa: '132', priceUSD: 32.93 },
  { description: 'Tapa trasera para motor "TEM"', carcasa: '160', priceUSD: 91.2 },
  { description: 'Tapa trasera para motor "TEM"', carcasa: '180', priceUSD: 80.54 },
  { description: 'Tapa trasera para motor "TEM"', carcasa: '200', priceUSD: 108.49 },
  { description: 'Tapa trasera para motor "TEM"', carcasa: '225', priceUSD: 148.26 },
  { description: 'Tapa trasera para motor "TEM"', carcasa: '250', priceUSD: 282.74 },
  { description: 'Tapa trasera para motor "TEM"', carcasa: '280', priceUSD: 282.74 },
  { description: 'Tapa trasera para motor "TEM"', carcasa: '315', priceUSD: 392.44 },
  // Fans (Ventilador)
  { description: 'Ventilador para motor "TEM"', carcasa: '056', priceUSD: 1.21 },
  { description: 'Ventilador para motor "TEM"', carcasa: '063', priceUSD: 1.21 },
  { description: 'Ventilador para motor "TEM"', carcasa: '071', priceUSD: 1.34 },
  { description: 'Ventilador para motor "TEM"', carcasa: '080', priceUSD: 2.78 },
  { description: 'Ventilador para motor "TEM"', carcasa: '090', priceUSD: 3.06 },
  { description: 'Ventilador para motor "TEM"', carcasa: '100', priceUSD: 3.52 },
  { description: 'Ventilador para motor "TEM"', carcasa: '112', priceUSD: 3.72 },
  { description: 'Ventilador para motor "TEM"', carcasa: '132', priceUSD: 5.91 },
  { description: 'Ventilador para motor "TEM"', carcasa: '160', priceUSD: 10.8 },
  { description: 'Ventilador para motor "TEM"', carcasa: '180', priceUSD: 18.37 },
  { description: 'Ventilador para motor "TEM"', carcasa: '200', priceUSD: 21.37 },
  { description: 'Ventilador para motor "TEM"', carcasa: '225', priceUSD: 34.26 },
  { description: 'Ventilador para motor "TEM"', carcasa: '250', priceUSD: 48.55 },
  { description: 'Ventilador para motor "TEM"', carcasa: '280', priceUSD: 59.24 },
  { description: 'Ventilador para motor "TEM"', carcasa: '315', priceUSD: 102.75 },
];
