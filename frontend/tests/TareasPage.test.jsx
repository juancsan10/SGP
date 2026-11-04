import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TareasPage from '../src/pages/TareasPage.jsx';
import { renderConSesion } from './render-con-sesion.jsx';
import { proyectosService, tareasService } from '../src/services/api.js';

vi.mock('../src/services/api.js', async (importOriginal) => {
  const real = await importOriginal();
  const vacio = () => Promise.resolve({ data: { data: [], meta: { total: 0, limit: 10, offset: 0 } } });
  const stubs = {};
  for (const [nombre, servicio] of Object.entries(real)) {
    if (nombre === 'default') continue;
    stubs[nombre] = Object.fromEntries(Object.keys(servicio).map((funcion) => [funcion, vi.fn(vacio)]));
  }
  return stubs;
});

const APRENDIZ = { id: 4, nombres: 'Carlos', apellidos: 'Herrera', rol: 'Aprendiz' };

const PROYECTOS_MOCK = [
  { id_proyecto: 1, nombre: 'Sistema SGP' },
];

const TAREAS_MOCK = [
  {
    id_tarea: 101,
    titulo: 'Configurar entorno de desarrollo',
    descripcion: 'Instalar node y librerías',
    estado: 'Completada',
    prioridad: 'Alta',
    asignado_nombre: 'Carlos Herrera',
  },
  {
    id_tarea: 102,
    titulo: 'Diseñar arquitectura de base de datos',
    descripcion: 'Crear esquema ER',
    estado: 'Pendiente',
    prioridad: 'Media',
    asignado_nombre: 'Carlos Herrera',
  },
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe('TareasPage (vista Aprendiz)', () => {
  it('renderiza el listado de tareas asignadas al aprendiz', async () => {
    vi.mocked(proyectosService.getAll).mockResolvedValueOnce({
      data: { data: PROYECTOS_MOCK },
    });
    vi.mocked(tareasService.getByProyecto).mockResolvedValueOnce({
      data: { data: TAREAS_MOCK },
    });

    renderConSesion(<TareasPage />, { usuario: APRENDIZ, ruta: '/tareas' });

    expect(await screen.findByRole('heading', { name: 'Mis Tareas' })).toBeInTheDocument();
    expect(screen.getByText('Configurar entorno de desarrollo')).toBeInTheDocument();
    expect(screen.getByText('Diseñar arquitectura de base de datos')).toBeInTheDocument();
  });

  it('permite filtrar tareas por texto', async () => {
    const user = userEvent.setup();
    vi.mocked(proyectosService.getAll).mockResolvedValueOnce({
      data: { data: PROYECTOS_MOCK },
    });
    vi.mocked(tareasService.getByProyecto).mockResolvedValueOnce({
      data: { data: TAREAS_MOCK },
    });

    renderConSesion(<TareasPage />, { usuario: APRENDIZ, ruta: '/tareas' });

    await screen.findByText('Configurar entorno de desarrollo');

    const inputBuscar = screen.getByPlaceholderText(/Buscar tarea, asignado o proyecto…/i);
    await user.type(inputBuscar, 'arquitectura');

    expect(screen.getByText('Diseñar arquitectura de base de datos')).toBeInTheDocument();
    expect(screen.queryByText('Configurar entorno de desarrollo')).not.toBeInTheDocument();
  });

  it('permite filtrar tareas por estado', async () => {
    const user = userEvent.setup();
    vi.mocked(proyectosService.getAll).mockResolvedValueOnce({
      data: { data: PROYECTOS_MOCK },
    });
    vi.mocked(tareasService.getByProyecto).mockResolvedValueOnce({
      data: { data: TAREAS_MOCK },
    });

    renderConSesion(<TareasPage />, { usuario: APRENDIZ, ruta: '/tareas' });

    await screen.findByText('Configurar entorno de desarrollo');

    const selectEstado = screen.getByRole('combobox');
    await user.selectOptions(selectEstado, 'Pendiente');

    expect(screen.getByText('Diseñar arquitectura de base de datos')).toBeInTheDocument();
    expect(screen.queryByText('Configurar entorno de desarrollo')).not.toBeInTheDocument();
  });
});
