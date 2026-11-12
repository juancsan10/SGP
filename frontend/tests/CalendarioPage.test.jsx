import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CalendarioPage from '../src/pages/CalendarioPage.jsx';
import { agendaService, proyectosService } from '../src/services/api.js';
import { renderConSesion } from './render-con-sesion.jsx';

vi.mock('../src/services/api.js', () => ({
  agendaService: { calendar: vi.fn() },
  proyectosService: { getAll: vi.fn() },
  // El contexto global carga la bandeja de notificaciones al montar
  notificacionesService: { getByUsuario: vi.fn().mockResolvedValue({ data: { data: [] } }) },
}));

const EVENTOS = [
  { id: 1, type: 'tarea', title: 'Modelo de datos', start: '2026-11-02', end: '2026-11-12' },
  { id: 2, type: 'reunion', title: 'Revisión semanal', start: '2026-11-12T14:30:00', end: '2026-11-12T14:30:00' },
];

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 12, 9, 0));
  localStorage.clear();
  proyectosService.getAll.mockResolvedValue({ data: { data: [{ id_proyecto: 3, nombre: 'SGP' }] } });
  agendaService.calendar.mockResolvedValue({ data: { data: EVENTOS } });
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('CalendarioPage', () => {
  it('should load the first project and show the month grid by default', async () => {
    // Arrange / Act
    renderConSesion(<CalendarioPage />, { usuario: { id: 2, rol: 'Instructor' } });

    // Assert
    expect(await screen.findByRole('grid', { name: 'Noviembre de 2026' })).toBeInTheDocument();
    expect(agendaService.calendar).toHaveBeenCalledWith('3');
    expect(screen.getByRole('button', { name: 'Mes' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /12 de noviembre: 2 actividades/i })).toBeInTheDocument();
  });

  it('should list the selected day activities below the grid', async () => {
    // Arrange / Act
    renderConSesion(<CalendarioPage />, { usuario: { id: 2, rol: 'Instructor' } });
    await screen.findByRole('grid');

    // Assert: hoy (12 de noviembre) viene elegido
    const detalle = screen.getByRole('heading', { level: 3, name: /12 de noviembre · Hoy/i }).closest('section');
    expect(within(detalle).getByRole('button', { name: /Reunión: Revisión semanal a las 14:30/ })).toBeInTheDocument();
  });

  it('should switch to the week and list views', async () => {
    // Arrange
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderConSesion(<CalendarioPage />, { usuario: { id: 2, rol: 'Instructor' } });
    await screen.findByRole('grid');

    // Act / Assert: semana
    await user.click(screen.getByRole('button', { name: 'Semana' }));
    expect(screen.getByRole('region', { name: /Jueves, 12 de noviembre/i })).toBeInTheDocument();

    // Act / Assert: lista (la vista original en tabla)
    await user.click(screen.getByRole('button', { name: 'Lista' }));
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Modelo de datos' })).toBeInTheDocument();
  });

  it('should show an error banner when the calendar cannot be loaded', async () => {
    // Arrange
    agendaService.calendar.mockRejectedValue({ response: { data: { message: 'No perteneces al proyecto solicitado' } } });

    // Act
    renderConSesion(<CalendarioPage />, { usuario: { id: 4, rol: 'Aprendiz' } });

    // Assert
    expect(await screen.findByRole('alert')).toHaveTextContent('No perteneces al proyecto solicitado');
  });
});
