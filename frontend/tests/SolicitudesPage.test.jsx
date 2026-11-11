import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SolicitudesPage from '../src/pages/SolicitudesPage.jsx';
import { equiposService, proyectosService, solicitudesAprendizService, solicitudesService } from '../src/services/api.js';
import { renderConSesion } from './render-con-sesion.jsx';

vi.mock('../src/services/api.js', () => ({
  solicitudesService: { mias: vi.fn(), tipos: vi.fn(), create: vi.fn(), getAll: vi.fn(), resolver: vi.fn() },
  equiposService: { listSolicitudes: vi.fn(), resolverSolicitud: vi.fn() },
  proyectosService: { getAll: vi.fn() },
  solicitudesAprendizService: { mias: vi.fn(), getAll: vi.fn(), crear: vi.fn(), resolver: vi.fn() },
  // El contexto global carga la bandeja de notificaciones al montar
  notificacionesService: { getByUsuario: vi.fn().mockResolvedValue({ data: { data: [] } }) },
}));

beforeEach(() => {
  vi.clearAllMocks();
  solicitudesService.mias.mockResolvedValue({ data: { data: [] } });
  solicitudesService.tipos.mockResolvedValue({ data: { data: [] } });
  proyectosService.getAll.mockResolvedValue({ data: { data: [] } });
  solicitudesService.getAll.mockResolvedValue({ data: { data: [], meta: { total: 0, limit: 5, offset: 0, resumen: { Pendiente: 0, Atendida: 0, Rechazada: 0 } } } });
  equiposService.listSolicitudes.mockResolvedValue({ data: { data: [] } });
  solicitudesAprendizService.mias.mockResolvedValue({ data: { data: [] } });
  solicitudesAprendizService.getAll.mockResolvedValue({ data: { data: [], meta: { total: 0, limit: 5, offset: 0, resumen: {} } } });
});

describe('SolicitudesPage (sección propia del menú)', () => {
  it('should show the request form entry point to an Instructor', async () => {
    // Arrange / Act
    renderConSesion(<SolicitudesPage />, { usuario: { id: 2, rol: 'Instructor' } });

    // Assert
    expect(screen.getByRole('heading', { level: 1, name: 'Solicitudes' })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: '+ Nueva solicitud' })).toBeInTheDocument();
    expect(solicitudesService.getAll).not.toHaveBeenCalled();
  });

  it('should show the inbox to the Administrador instead of the request form', async () => {
    // Arrange / Act
    renderConSesion(<SolicitudesPage />, { usuario: { id: 1, rol: 'Administrador' } });

    // Assert
    expect(await screen.findByText('Solicitudes de instructores y aprendices')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '+ Nueva solicitud' })).not.toBeInTheDocument();
  });
});
