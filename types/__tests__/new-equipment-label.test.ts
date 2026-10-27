import { describe, it, expect } from 'vitest';
import { newEquipmentLabel } from '../budget';

describe('newEquipmentLabel', () => {
  it('usa la etiqueta del catálogo para los tipos estándar', () => {
    expect(newEquipmentLabel({ type: 'motor_electrico' })).toBe('Motor Eléctrico');
    expect(newEquipmentLabel({ type: 'variador_frecuencia' })).toBe('Variador de Frecuencia');
  });

  it('usa la descripción personalizada en vez de imprimir "otro"', () => {
    // Los chips de tipos propios de la empresa se cargan así.
    expect(newEquipmentLabel({ type: 'otro', customDescription: 'Tablero eléctrico' }))
      .toBe('Tablero eléctrico');
  });

  it('cae en "Otro" si el tipo personalizado quedó sin descripción', () => {
    expect(newEquipmentLabel({ type: 'otro' })).toBe('Otro');
    expect(newEquipmentLabel({ type: 'otro', customDescription: '   ' })).toBe('Otro');
  });
});
