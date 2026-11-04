import { screen } from '@testing-library/react';
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
    await screen.findByRole('option', { name: 'tareas' });

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
