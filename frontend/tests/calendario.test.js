import { describe, expect, it } from 'vitest';
import { agruparPorDia, claveDia, cuadriculaMes, diasDeSemana, horaEvento, inicioSemana } from '../src/utils/calendario.js';

describe('utils/calendario (lógica pura)', () => {
  it('should keep DATE values on their day even when they arrive as UTC midnight', () => {
    expect(claveDia('2026-11-12')).toBe('2026-11-12');
    expect(claveDia('2026-11-12T00:00:00.000Z')).toBe('2026-11-12');
    expect(claveDia(null)).toBeNull();
    expect(claveDia('no es fecha')).toBeNull();
  });

  it('should build a 42-day month grid that starts on Monday', () => {
    const celdas = cuadriculaMes(2026, 10); // noviembre de 2026: el 1 es domingo
    expect(celdas).toHaveLength(42);
    expect(celdas[0].clave).toBe('2026-10-26');
    expect(celdas[0].delMes).toBe(false);
    expect(celdas.find(c => c.clave === '2026-11-01').delMes).toBe(true);
    expect(celdas.every(c => (c.fecha.getDay() + 6) % 7 === celdas.indexOf(c) % 7)).toBe(true);
  });

  it('should return the seven days from Monday to Sunday of the given week', () => {
    const dias = diasDeSemana(new Date(2026, 10, 5)); // jueves
    expect(dias.map(d => d.getDate())).toEqual([2, 3, 4, 5, 6, 7, 8]);
    expect(inicioSemana(new Date(2026, 10, 8)).getDate()).toBe(2); // domingo -> lunes anterior
  });

  it('should group events by their due date and sort them inside each day', () => {
    const grupos = agruparPorDia([
      { id: 1, type: 'tarea', title: 'B tarea', start: '2026-11-01', end: '2026-11-10' },
      { id: 2, type: 'entregable', title: 'A entregable', start: '2026-11-10', end: '2026-11-10' },
      { id: 3, type: 'reunion', title: 'Sin fecha', start: null, end: null },
    ]);
    expect(Object.keys(grupos)).toEqual(['2026-11-10']);
    expect(grupos['2026-11-10'].map(e => e.id)).toEqual([2, 1]);
  });

  it('should show a time only for values that carry a real hour', () => {
    expect(horaEvento('2026-11-12')).toBe('');
    expect(horaEvento('2026-11-12T00:00:00.000Z')).toBe('');
    expect(horaEvento('2026-11-12T14:30:00')).toBe('14:30');
  });
});
