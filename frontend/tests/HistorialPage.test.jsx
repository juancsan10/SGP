import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import HistorialPage from '../src/pages/HistorialPage.jsx';
import { historialService } from '../src/services/api.js';
import { renderConSesion } from './render-con-sesion.jsx';

vi.mock('../src/services/api.js', () => ({
  historialService: { getEstadisticas: vi.fn(), getAll: vi.fn(), getEliminaciones: vi.fn(), getEliminacion: vi.fn() },
}));

const ADMIN = { id: 1, nombres: 'Rubiel', rol: 'Administrador' };
const ESTADISTICAS = {
  totales: { usuarios_activos: 12, total_usuarios: 13, proyectos_activos: 3, total_proyectos: 5, tareas_completadas: 4, total_tareas: 15, entregas_con_correccion: 1, solicitudes_pendientes: 1, repositorios_con_alerta: 0 },
  porTabla: [{ tabla_afectada: 'tareas', total: 20 }, { tabla_afectada: 'proyectos', total: 6 }],
  porAccion: [{ accion: 'INSERT', total: 18 }],
  usuariosMasActivos: [{ usuario: 'Laura Gómez', rol: 'Instructor', total_acciones: 14 }],
};
const REGISTROS = [{ id_historial: 1, tabla_afectada: 'proyectos', id_registro: 7, accion: 'UPDATE', usuario_nombre: 'Laura Gómez', fecha_cambio: '2026-10-20T15:00:00Z' }];

beforeEach(() => {
  vi.clearAllMocks();
  historialService.getEstadisticas.mockResolvedValue({ data: { data: ESTADISTICAS } });
  historialService.getAll.mockResolvedValue({ data: { data: REGISTROS, meta: { total: 1, limit: 10, offset: 0 } } });
  historialService.getEliminaciones.mockResolvedValue({ data: { data: [], meta: { total: 0, limit: 5, offset: 0 } } });
});

describe('HistorialPage', () => {
  it('should show the system totals from the statistics', async () => {
    renderConSesion(<HistorialPage />, { usuario: ADMIN });

    expect(await screen.findByText('Usuarios activos (13 total)')).toBeInTheDocument();
    expect(screen.getByText('Proyectos activos (5 total)')).toBeInTheDocument();
  });

  it('should ask the backend only for the selected table', async () => {
    // Arrange
    const user = userEvent.setup();
    renderConSesion(<HistorialPage />, { usuario: ADMIN });
    await screen.findByRole('option', { name: 'Tareas' });

    // Act
    await user.selectOptions(screen.getByDisplayValue('Todas las tablas'), 'tareas');

    // Assert
    expect(historialService.getAll).toHaveBeenLastCalledWith(expect.objectContaining({ tabla: 'tareas', offset: 0 }));
  });

  it('should show the error when the statistics cannot be loaded', async () => {
    historialService.getEstadisticas.mockRejectedValue({ response: { data: { message: 'No tienes permisos para realizar esta acción' } } });

    renderConSesion(<HistorialPage />, { usuario: ADMIN });

    expect(await screen.findByText('No tienes permisos para realizar esta acción')).toBeInTheDocument();
  });

  it('should show the empty state when no change matches', async () => {
    historialService.getAll.mockResolvedValue({ data: { data: [], meta: { total: 0, limit: 10, offset: 0 } } });

    renderConSesion(<HistorialPage />, { usuario: ADMIN });

    expect(await screen.findByRole('heading', { name: 'Sin registros' })).toBeInTheDocument();
  });
});

describe('HistorialPage como Instructor', () => {
  const INSTRUCTOR = { id: 2, nombres: 'Laura', rol: 'Instructor' };
  const ACTIVIDAD = [
    { id_historial: 5, tabla_afectada: 'entregas_tareas', id_registro: 3, accion: 'INSERT', usuario_nombre: 'Carlos Herrera', usuario_rol: 'Aprendiz', fecha_cambio: '2026-11-10T15:00:00Z' },
    { id_historial: 4, tabla_afectada: 'tareas', id_registro: 8, accion: 'INSERT', usuario_nombre: 'Laura Gómez', usuario_rol: 'Instructor', fecha_cambio: '2026-11-09T15:00:00Z' },
  ];

  it('should show his and his apprentices activity without the admin-only panels', async () => {
    // Arrange
    historialService.getAll.mockResolvedValue({ data: { data: ACTIVIDAD, meta: { total: 2, limit: 10, offset: 0 } } });

    // Act
    renderConSesion(<HistorialPage />, { usuario: INSTRUCTOR });

    // Assert
    expect(await screen.findByText('Carlos Herrera')).toBeInTheDocument();
    expect(screen.getByText('Lo que has hecho tú y lo que han hecho los aprendices de tus proyectos')).toBeInTheDocument();
    const fila = screen.getByText('Carlos Herrera').closest('tr');
    expect(within(fila).getByText('Entregas')).toBeInTheDocument();
    expect(within(fila).getByText('Aprendiz')).toBeInTheDocument();
    expect(historialService.getEstadisticas).not.toHaveBeenCalled();
    expect(historialService.getEliminaciones).not.toHaveBeenCalled();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('should ask the backend only for the apprentices activity when filtering by Quién', async () => {
    // Arrange
    const user = userEvent.setup();
    historialService.getAll.mockResolvedValue({ data: { data: ACTIVIDAD, meta: { total: 2, limit: 10, offset: 0 } } });
    renderConSesion(<HistorialPage />, { usuario: INSTRUCTOR });
    await screen.findByText('Carlos Herrera');

    // Act
    await user.selectOptions(screen.getByRole('combobox', { name: 'Quién' }), 'aprendices');

    // Assert
    expect(historialService.getAll).toHaveBeenLastCalledWith(expect.objectContaining({ autor: 'aprendices', offset: 0 }));
  });
});
