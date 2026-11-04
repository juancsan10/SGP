import { screen, within } from '@testing-library/react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import DashboardPage from '../src/pages/DashboardPage.jsx';
import { mensajesService, proyectosService, solicitudesService, tareasService } from '../src/services/api.js';
import { renderConSesion } from './render-con-sesion.jsx';

vi.mock('../src/services/api.js', () => ({
  proyectosService: { getAll: vi.fn() },
  tareasService: { getRecientes: vi.fn() },
  mensajesService: { getRecientes: vi.fn() },
  solicitudesService: { mias: vi.fn(), tipos: vi.fn() },
}));

const INSTRUCTOR = { id: 2, nombres: 'Laura', rol: 'Instructor' };
const PROYECTOS = [
  { id_proyecto: 1, nombre: 'SGP', estado: 'Activo' },
  { id_proyecto: 2, nombre: 'Citas', estado: 'Activo' },
  { id_proyecto: 3, nombre: 'Inventario', estado: 'En Planificación' },
  { id_proyecto: 4, nombre: 'Biblioteca', estado: 'Planeado' },
  { id_proyecto: 5, nombre: 'Nómina', estado: 'Finalizado' },
];
const TAREAS = [
  { id_tarea: 1, titulo: 'Login', estado: 'Pendiente' },
  { id_tarea: 2, titulo: 'Modelo ER', estado: 'Completada' },
];

// El número de cada tarjeta está junto a su etiqueta
const valorDe = (etiqueta) => within(screen.getByText(etiqueta).parentElement).getByText(/^\d+$/).textContent;

beforeAll(() => {
  // Sin animación: el número se muestra directo (como con "reducir movimiento")
  window.matchMedia = () => ({ matches: true });
});

beforeEach(() => {
  vi.clearAllMocks();
  proyectosService.getAll.mockResolvedValue({ data: { data: PROYECTOS } });
  tareasService.getRecientes.mockResolvedValue({ data: { data: TAREAS } });
  mensajesService.getRecientes.mockResolvedValue({ data: { data: [] } });
  solicitudesService.mias.mockResolvedValue({ data: { data: [] } });
  solicitudesService.tipos.mockResolvedValue({ data: { data: [] } });
});

describe('DashboardPage', () => {
  it('should count the projects by state', async () => {
    // Arrange + Act
    renderConSesion(<DashboardPage />, { usuario: INSTRUCTOR });
    await screen.findByRole('heading', { name: /Hola, Laura/ });

    // Assert: "Planeado" cuenta como en planificación
    expect(valorDe('Proyectos totales')).toBe('5');
    expect(valorDe('En curso')).toBe('2');
    expect(valorDe('En planificación')).toBe('2');
    expect(valorDe('Finalizados')).toBe('1');
  });

  it('should only count the pending tasks', async () => {
    renderConSesion(<DashboardPage />, { usuario: INSTRUCTOR });
    await screen.findByRole('heading', { name: /Hola, Laura/ });

    expect(valorDe('Tareas pendientes')).toBe('1');
  });

  it('should still show the dashboard when the recent messages fail', async () => {
    mensajesService.getRecientes.mockRejectedValue(new Error('500'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    renderConSesion(<DashboardPage />, { usuario: INSTRUCTOR });

    expect(await screen.findByRole('heading', { name: /Hola, Laura/ })).toBeInTheDocument();
  });
});
