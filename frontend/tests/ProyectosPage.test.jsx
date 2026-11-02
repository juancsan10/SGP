import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProyectosPage from '../src/pages/ProyectosPage.jsx';
import { proyectosService, usuariosService } from '../src/services/api.js';
import { renderConSesion } from './render-con-sesion.jsx';

vi.mock('../src/services/api.js', () => ({
  proyectosService: { getAll: vi.fn(), create: vi.fn() },
  usuariosService: { getAll: vi.fn() },
}));

const APRENDIZ = { id: 4, nombres: 'Carlos', rol: 'Aprendiz' };
const INSTRUCTOR = { id: 2, nombres: 'Laura', rol: 'Instructor' };
const PROYECTOS = [
  { id_proyecto: 1, nombre: 'SGP SENA', instructor: 'Laura Gómez', estado: 'Activo', porcentaje_avance: '40.00', fecha_inicio: '2026-02-01' },
  { id_proyecto: 2, nombre: 'App de citas', instructor: 'Miguel Torres', estado: 'Finalizado', porcentaje_avance: '100.00', fecha_inicio: '2026-01-10' },
];

function backendResponde(proyectos) {
  proyectosService.getAll.mockResolvedValue({ data: { data: proyectos } });
  usuariosService.getAll.mockResolvedValue({ data: { data: [] } });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ProyectosPage', () => {
  it('should list the projects returned by the backend', async () => {
    backendResponde(PROYECTOS);

    renderConSesion(<ProyectosPage />, { usuario: APRENDIZ });

    expect(await screen.findByText('SGP SENA')).toBeInTheDocument();
    expect(screen.getByText('App de citas')).toBeInTheDocument();
  });

  it('should still show the projects to an apprentice when the users endpoint fails', async () => {
    // Para un aprendiz /usuarios responde 403; antes eso dejaba la página vacía
    proyectosService.getAll.mockResolvedValue({ data: { data: PROYECTOS } });
    usuariosService.getAll.mockRejectedValue({ response: { status: 403 } });

    renderConSesion(<ProyectosPage />, { usuario: APRENDIZ });

    expect(await screen.findByText('SGP SENA')).toBeInTheDocument();
  });

  it('should hide the create button from an apprentice', async () => {
    backendResponde(PROYECTOS);

    renderConSesion(<ProyectosPage />, { usuario: APRENDIZ });
    await screen.findByText('SGP SENA');

    expect(screen.queryByRole('button', { name: '+ Nuevo proyecto' })).not.toBeInTheDocument();
  });

  it('should show the create button to an instructor', async () => {
    backendResponde(PROYECTOS);

    renderConSesion(<ProyectosPage />, { usuario: INSTRUCTOR });

    expect(await screen.findByRole('button', { name: '+ Nuevo proyecto' })).toBeInTheDocument();
  });

  it('should filter the list while typing in the search box', async () => {
    backendResponde(PROYECTOS);
    renderConSesion(<ProyectosPage />, { usuario: APRENDIZ });
    await screen.findByText('SGP SENA');

    await userEvent.type(screen.getByPlaceholderText(/Buscar por nombre o instructor/), 'torres');

    expect(screen.queryByText('SGP SENA')).not.toBeInTheDocument();
    expect(screen.getByText('App de citas')).toBeInTheDocument();
  });

  it('should create the project in the name of the logged instructor', async () => {
    // Arrange
    backendResponde(PROYECTOS);
    proyectosService.create.mockResolvedValueOnce({ data: { success: true } });
    const user = userEvent.setup();
    renderConSesion(<ProyectosPage />, { usuario: INSTRUCTOR });

    // Act
    await user.click(await screen.findByRole('button', { name: '+ Nuevo proyecto' }));
    await user.type(screen.getByLabelText('Nombre *'), 'Proyecto nuevo');
    await user.type(screen.getByLabelText('Fecha inicio *'), '2026-11-01');
    await user.click(screen.getByRole('button', { name: 'Crear proyecto' }));

    // Assert: el instructor no elige instructor, queda a su nombre
    expect(screen.queryByLabelText('Instructor *')).not.toBeInTheDocument();
    expect(proyectosService.create).toHaveBeenCalledWith(expect.objectContaining({ nombre: 'Proyecto nuevo', id_instructor: '2' }));
  });

  it('should show the backend message when the project cannot be created', async () => {
    backendResponde(PROYECTOS);
    proyectosService.create.mockRejectedValueOnce({ response: { data: { message: 'RN-002: El instructor ya supervisa 10 proyectos activos' } } });
    const user = userEvent.setup();
    renderConSesion(<ProyectosPage />, { usuario: INSTRUCTOR });

    await user.click(await screen.findByRole('button', { name: '+ Nuevo proyecto' }));
    await user.type(screen.getByLabelText('Nombre *'), 'Uno más');
    await user.type(screen.getByLabelText('Fecha inicio *'), '2026-11-01');
    await user.click(screen.getByRole('button', { name: 'Crear proyecto' }));

    expect(await screen.findByText('RN-002: El instructor ya supervisa 10 proyectos activos')).toBeInTheDocument();
  });
});
