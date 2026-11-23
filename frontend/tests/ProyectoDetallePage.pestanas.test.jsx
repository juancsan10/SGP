import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import ProyectoDetallePage from '../src/pages/ProyectoDetallePage.jsx';
import * as api from '../src/services/api.js';
import { renderConSesion } from './render-con-sesion.jsx';

// Semana 7 (umbral del 75 %): las pestañas del detalle del proyecto que aún no tenían tests.
// Stub de todo el cliente HTTP, igual que en ProyectoDetallePage.test.jsx
vi.mock('../src/services/api.js', async (importOriginal) => {
  const real = await importOriginal();
  const stubs = {};
  for (const [nombre, servicio] of Object.entries(real)) {
    if (nombre === 'default') continue;
    stubs[nombre] = Object.fromEntries(Object.keys(servicio).map((f) => [f, vi.fn()]));
  }
  return stubs;
});

const lista = (data = []) => Promise.resolve({ data: { data } });
const ADMIN = { id: 1, nombres: 'Rubiel', apellidos: 'Rodríguez', rol: 'Administrador' };
const INSTRUCTOR = { id: 2, nombres: 'Laura', apellidos: 'Gómez', rol: 'Instructor' };
const PROYECTO = { id_proyecto: 1, nombre: 'SGP SENA', instructor: 'Laura Gómez', estado: 'Activo', porcentaje_avance: '40.00' };
const FASE = { id_fase: 3, nombre_fase: 'Análisis', fecha_inicio: '2026-02-01', fecha_fin: '2026-03-01', porcentaje_avance: '50.00' };
const ENTREGABLE = { id_entregable: 8, nombre: 'Documento de requisitos', id_fase: 3, fecha_entrega: '2026-02-20', estado: 'Pendiente', version: '1.0' };
const REPO = { id_repositorio: 6, url_github: 'https://github.com/sena/sgp', rama_principal: 'main', estado_semaforo: 'verde', activo: 1 };

function abrirPestana(usuario, pestana) {
  renderConSesion(
    <Routes><Route path="/proyectos/:id" element={<ProyectoDetallePage />} /></Routes>,
    { usuario, ruta: '/proyectos/1' },
  );
  const user = userEvent.setup();
  return { user, ir: async () => user.click(await screen.findByRole('button', { name: pestana })) };
}

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

beforeEach(() => {
  vi.clearAllMocks();
  for (const servicio of Object.values(api)) {
    for (const funcion of Object.values(servicio)) funcion.mockImplementation(() => lista());
  }
  api.proyectosService.getById.mockResolvedValue({ data: { data: PROYECTO } });
});

describe('pestaña Fases', () => {
  it('should create a phase and show it after reloading the list', async () => {
    // Arrange
    const { user, ir } = abrirPestana(INSTRUCTOR, 'Fases');
    await ir();
    api.fasesService.create.mockResolvedValue({ data: { success: true } });
    api.fasesService.getByProyecto.mockResolvedValue({ data: { data: [FASE] } });

    // Act
    await user.click(screen.getByRole('button', { name: '+ Nueva fase' }));
    const dialogo = screen.getByRole('dialog', { name: 'Nueva fase' });
    await user.type(within(dialogo).getByLabelText('Nombre de la fase *'), 'Análisis');
    await user.click(within(dialogo).getByRole('button', { name: 'Crear fase' }));

    // Assert
    expect(api.fasesService.create).toHaveBeenCalledWith(expect.objectContaining({ nombre_fase: 'Análisis', id_proyecto: '1' }));
    expect(await screen.findByText('Análisis')).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Nueva fase' })).not.toBeInTheDocument();
  });

  it('should keep the form open and show the message of the backend when it rejects the phase', async () => {
    const { user, ir } = abrirPestana(INSTRUCTOR, 'Fases');
    await ir();
    api.fasesService.create.mockRejectedValue({ response: { data: { message: 'La fecha de fin de la fase no puede ser posterior al fin del proyecto (2026-06-30)' } } });

    await user.click(screen.getByRole('button', { name: '+ Nueva fase' }));
    const dialogo = screen.getByRole('dialog', { name: 'Nueva fase' });
    await user.type(within(dialogo).getByLabelText('Nombre de la fase *'), 'Cierre');
    await user.click(within(dialogo).getByRole('button', { name: 'Crear fase' }));

    expect(await within(dialogo).findByRole('alert')).toHaveTextContent('posterior al fin del proyecto (2026-06-30)');
  });

  it('should not offer "+ Nueva fase" to the administrator (only supervises)', async () => {
    const { ir } = abrirPestana(ADMIN, 'Fases');
    await ir();

    expect(screen.getByText('Sin fases')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '+ Nueva fase' })).not.toBeInTheDocument();
  });
});

describe('pestaña Entregables', () => {
  beforeEach(() => {
    api.fasesService.getByProyecto.mockResolvedValue({ data: { data: [FASE] } });
    api.entregablesService.getByFase.mockResolvedValue({ data: { data: [ENTREGABLE] } });
  });

  it('should list the deliverable with its phase and open its detail with comments and grades', async () => {
    api.comentariosService.getByEntregable.mockResolvedValue({ data: { data: [{ id_comentario: 1, contenido: 'Falta el alcance', autor_nombre: 'Laura Gómez', autor_rol: 'Instructor' }] } });
    api.evaluacionesService.getByEntregable.mockResolvedValue({ data: { data: [{ id_evaluacion: 2, calificacion: '85.00', evaluador_nombre: 'Laura Gómez' }] } });
    const { user, ir } = abrirPestana(INSTRUCTOR, 'Entregables');
    await ir();

    const fila = await screen.findByRole('row', { name: /Documento de requisitos/ });
    expect(within(fila).getByText('Análisis')).toBeInTheDocument();
    await user.click(within(fila).getByRole('button', { name: /Ver detalle/ }));

    expect(await screen.findByText('Falta el alcance')).toBeInTheDocument();
    expect(api.archivosService.getByEntregable).toHaveBeenCalledWith(8);
  });

  it('should send a comment from the detail and reload the comments', async () => {
    const { user, ir } = abrirPestana(INSTRUCTOR, 'Entregables');
    await ir();
    await user.click(await screen.findByRole('button', { name: /Ver detalle/ }));
    api.comentariosService.create.mockResolvedValue({ data: { success: true } });
    api.comentariosService.getByEntregable.mockResolvedValue({ data: { data: [{ id_comentario: 3, contenido: 'Aprobado el alcance', autor_nombre: 'Laura Gómez' }] } });

    await user.type(await screen.findByLabelText('Nuevo comentario'), 'Aprobado el alcance');
    await user.click(screen.getByRole('button', { name: 'Enviar' }));

    expect(api.comentariosService.create).toHaveBeenCalledWith({ contenido: 'Aprobado el alcance', id_entregable: 8 });
    expect(await screen.findByText('Aprobado el alcance', { selector: ':not(input)' })).toBeInTheDocument();
  });

  it('should create a deliverable in the first phase by default', async () => {
    const { user, ir } = abrirPestana(INSTRUCTOR, 'Entregables');
    await ir();
    api.entregablesService.create.mockResolvedValue({ data: { success: true } });

    await user.click(await screen.findByRole('button', { name: '+ Nuevo entregable' }));
    const dialogo = screen.getByRole('dialog', { name: 'Nuevo entregable' });
    await user.type(within(dialogo).getByLabelText('Nombre *'), 'Manual de usuario');
    await user.type(within(dialogo).getByLabelText('Fecha de entrega *'), '2026-02-25');
    await user.click(within(dialogo).getByRole('button', { name: 'Crear entregable' }));

    expect(api.entregablesService.create).toHaveBeenCalledWith(expect.objectContaining({
      nombre: 'Manual de usuario', fecha_entrega: '2026-02-25', id_fase: 3, version: '1.0',
    }));
  });
});

describe('pestaña Repositorios', () => {
  it('should link a repository with "main" as the default branch', async () => {
    const { user, ir } = abrirPestana(INSTRUCTOR, 'Repositorios');
    await ir();
    api.repositoriosService.create.mockResolvedValue({ data: { success: true } });
    api.repositoriosService.getByProyecto.mockResolvedValue({ data: { data: [REPO] } });

    await user.click(screen.getByRole('button', { name: '+ Vincular repositorio' }));
    const dialogo = screen.getByRole('dialog', { name: 'Vincular repositorio' });
    await user.type(within(dialogo).getByLabelText('URL de GitHub *'), 'https://github.com/sena/sgp');
    await user.click(within(dialogo).getByRole('button', { name: 'Vincular' }));

    expect(api.repositoriosService.create).toHaveBeenCalledWith({ url_github: 'https://github.com/sena/sgp', rama_principal: 'main', id_proyecto: '1' });
    expect(await screen.findByText(/github\.com\/sena\/sgp/)).toBeInTheDocument();
  });

  it('should let the administrator change the traffic light and disable the repository', async () => {
    api.repositoriosService.getByProyecto.mockResolvedValue({ data: { data: [REPO] } });
    api.repositoriosService.setSemaforo.mockResolvedValue({});
    api.repositoriosService.toggleEstado.mockResolvedValue({});
    const { user, ir } = abrirPestana(ADMIN, 'Repositorios');
    await ir();

    await user.selectOptions(await screen.findByRole('combobox'), 'rojo');
    await user.click(screen.getByRole('button', { name: 'Deshabilitar' }));

    expect(api.repositoriosService.setSemaforo).toHaveBeenCalledWith(6, 'rojo');
    expect(api.repositoriosService.toggleEstado).toHaveBeenCalledWith(6, false);
  });
});

describe('pestaña Reuniones', () => {
  it('should schedule a meeting and list it', async () => {
    const { user, ir } = abrirPestana(INSTRUCTOR, 'Reuniones');
    await ir();
    api.reunionesService.create.mockResolvedValue({ data: { success: true } });
    api.reunionesService.getByProyecto.mockResolvedValue({ data: { data: [{ id_reunion: 4, titulo: 'Seguimiento semanal', fecha_reunion: '2026-03-20T10:00:00', lugar: 'Ambiente 204' }] } });

    await user.click(screen.getByRole('button', { name: '+ Programar reunión' }));
    const dialogo = screen.getByRole('dialog', { name: 'Programar reunión' });
    await user.type(within(dialogo).getByLabelText('Título *'), 'Seguimiento semanal');
    await user.type(within(dialogo).getByLabelText('Fecha y hora *'), '2026-03-20T10:00');
    await user.click(within(dialogo).getByRole('button', { name: 'Programar reunión' }));

    expect(api.reunionesService.create).toHaveBeenCalledWith(expect.objectContaining({ titulo: 'Seguimiento semanal', id_proyecto: '1' }));
    expect(await screen.findByText(/Seguimiento semanal/)).toBeInTheDocument();
  });

  it('should ask for confirmation and show the error when the meeting cannot be cancelled', async () => {
    api.reunionesService.getByProyecto.mockResolvedValue({ data: { data: [{ id_reunion: 4, titulo: 'Seguimiento semanal', fecha_reunion: '2026-03-20T10:00:00' }] } });
    api.reunionesService.remove.mockRejectedValue({ response: { data: { message: 'Reunión no encontrada' } } });
    const { user, ir } = abrirPestana(INSTRUCTOR, 'Reuniones');
    await ir();

    await user.click(await screen.findByRole('button', { name: 'Cancelar' }));
    expect(screen.getByText('¿Cancelar esta reunión?')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Sí, continuar' }));

    expect(api.reunionesService.remove).toHaveBeenCalledWith(4);
    expect(await screen.findByText('Reunión no encontrada')).toBeInTheDocument();
  });
});
