import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TareasPage from '../src/pages/TareasPage.jsx';
import { renderConSesion } from './render-con-sesion.jsx';
import { entregasService, tareasService } from '../src/services/api.js';

// Semana 8 (capa Front): el reporte de cobertura marcaba TareasPage.jsx con 22 % de ramas.
// Toda la vista de supervisión (Administrador / Instructor, líneas 158-314) no tenía ningún test.
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

const ADMIN = { id: 1, nombres: 'Rubiel', apellidos: 'Rodríguez', rol: 'Administrador' };
const INSTRUCTOR = { id: 2, nombres: 'Laura', apellidos: 'Gómez', rol: 'Instructor' };

const TAREAS = [
  {
    id_tarea: 1, titulo: 'Diagrama de clases', nombre_proyecto: 'SGP', estado: 'Pendiente', prioridad: 'Alta',
    asignado_nombre: 'Ana Ruiz', cc_aprendiz: '1012345678', instructor_nombre: 'Laura Gómez', cc_instructor: null,
    fecha_vencimiento: '2020-01-10', porcentaje_avance: '20.00', id_entrega: 30, calificacion: '85.00',
  },
  {
    id_tarea: 2, titulo: 'Casos de uso', nombre_proyecto: 'SGP', estado: 'Completada', prioridad: 'Baja',
    asignado_nombre: 'Luis Peña', cc_aprendiz: null, instructor_nombre: 'Laura Gómez', cc_instructor: '79000000',
    fecha_vencimiento: null, porcentaje_avance: null, id_entrega: null,
  },
];

const conTareas = (data = TAREAS, total = data.length, offset = 0) =>
  Promise.resolve({ data: { data, meta: { total, limit: 10, offset } } });

beforeEach(() => {
  vi.clearAllMocks();
});

describe('TareasPage (vista de supervisión)', () => {
  it('should list every task with project, people, due date and grade for the Administrador', async () => {
    tareasService.getAllAdmin.mockImplementation(() => conTareas());

    renderConSesion(<TareasPage />, { usuario: ADMIN });

    const fila = await screen.findByRole('row', { name: /Diagrama de clases/ });
    expect(screen.getByText('Supervisión de todos los proyectos · 2 tarea(s)')).toBeInTheDocument();
    expect(within(fila).getByText('1012345678')).toBeInTheDocument();
    expect(within(fila).getByRole('button', { name: 'Ver revisión →' })).toBeInTheDocument();
    const sinEntrega = screen.getByRole('row', { name: /Casos de uso/ });
    expect(within(sinEntrega).getByText('Sin entrega')).toBeInTheDocument();
    expect(within(sinEntrega).getByText('79000000')).toBeInTheDocument();
  });

  it('should tell the Instructor that he only supervises his own projects', async () => {
    tareasService.getAllAdmin.mockImplementation(() => conTareas([]));

    renderConSesion(<TareasPage />, { usuario: INSTRUCTOR });

    expect(await screen.findByText('Supervisión de tus proyectos · 0 tarea(s)')).toBeInTheDocument();
    expect(screen.getByText('Sin tareas')).toBeInTheDocument();
  });

  it('should send the state and priority filters to the API and clear them all', async () => {
    tareasService.getAllAdmin.mockImplementation(() => conTareas());
    const user = userEvent.setup();
    renderConSesion(<TareasPage />, { usuario: ADMIN });
    await screen.findByRole('row', { name: /Diagrama de clases/ });

    await user.selectOptions(screen.getByDisplayValue('Todos los estados'), 'Completada');
    await user.selectOptions(screen.getByDisplayValue('Toda prioridad'), 'Alta');

    await waitFor(() => expect(tareasService.getAllAdmin).toHaveBeenLastCalledWith(
      expect.objectContaining({ estado: 'Completada', prioridad: 'Alta', offset: 0 }),
    ));
    await user.click(screen.getByRole('button', { name: 'Limpiar filtros ×' }));
    expect(screen.queryByRole('button', { name: 'Limpiar filtros ×' })).not.toBeInTheDocument();
  });

  it('should keep only valid characters in the cc filter and search by it after typing', async () => {
    tareasService.getAllAdmin.mockImplementation(() => conTareas());
    const user = userEvent.setup();
    renderConSesion(<TareasPage />, { usuario: ADMIN });
    await screen.findByRole('row', { name: /Diagrama de clases/ });

    await user.type(screen.getByPlaceholderText(/cc aprendiz o instructor/), '10 12$');
    await user.type(screen.getByPlaceholderText('Nombre del proyecto…'), 'SGP');

    expect(screen.getByPlaceholderText(/cc aprendiz o instructor/)).toHaveValue('1012');
    await waitFor(() => expect(tareasService.getAllAdmin).toHaveBeenLastCalledWith(
      expect.objectContaining({ cc: '1012', proyecto: 'SGP' }),
    ));
  });

  it('should show the error of the API instead of an endless table when loading fails', async () => {
    tareasService.getAllAdmin.mockRejectedValue({ response: { data: { message: 'Token inválido o expirado' } } });

    renderConSesion(<TareasPage />, { usuario: ADMIN });

    expect(await screen.findByText('Token inválido o expirado')).toBeInTheDocument();
  });

  it('should use a generic message when the failure has no answer from the server', async () => {
    tareasService.getAllAdmin.mockRejectedValue(new Error('Network Error'));

    renderConSesion(<TareasPage />, { usuario: ADMIN });

    expect(await screen.findByText('No se pudieron cargar las tareas')).toBeInTheDocument();
  });

  it('should open the grade review of a delivery and close it', async () => {
    tareasService.getAllAdmin.mockImplementation(() => conTareas());
    entregasService.getDetalle.mockResolvedValue({ data: { data: { id_entrega: 30, calificacion: '85.00', estado: 'Aprobada' } } });
    const user = userEvent.setup();
    renderConSesion(<TareasPage />, { usuario: ADMIN });

    await user.click(await screen.findByRole('button', { name: 'Ver revisión →' }));

    expect(entregasService.getDetalle).toHaveBeenCalledWith(30);
    const dialogo = await screen.findByRole('dialog');
    await user.keyboard('{Escape}');
    await waitFor(() => expect(dialogo).not.toBeInTheDocument());
  });

  it('should ask the API for the next page', async () => {
    tareasService.getAllAdmin.mockImplementation((params) => conTareas(TAREAS, 25, params.offset));
    const user = userEvent.setup();
    renderConSesion(<TareasPage />, { usuario: ADMIN });
    await screen.findByRole('row', { name: /Diagrama de clases/ });

    await user.click(screen.getByRole('button', { name: /siguiente/i }));

    await waitFor(() => expect(tareasService.getAllAdmin).toHaveBeenLastCalledWith(expect.objectContaining({ offset: 10 })));
  });
});
