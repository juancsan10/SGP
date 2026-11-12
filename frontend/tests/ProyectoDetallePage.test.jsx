import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import ProyectoDetallePage from '../src/pages/ProyectoDetallePage.jsx';
import * as api from '../src/services/api.js';
import { renderConSesion } from './render-con-sesion.jsx';

// Stub de todo el cliente HTTP: cada función responde una lista vacía, y cada
// test cambia solo lo que necesita
vi.mock('../src/services/api.js', async (importOriginal) => {
  const real = await importOriginal();
  const stubs = {};
  for (const [nombre, servicio] of Object.entries(real)) {
    if (nombre === 'default') continue;
    stubs[nombre] = Object.fromEntries(Object.keys(servicio).map((f) => [f, vi.fn()]));
  }
  return stubs;
});

const vacio = () => Promise.resolve({ data: { data: [] } });
const ADMIN = { id: 1, nombres: 'Rubiel', apellidos: 'Rodríguez', rol: 'Administrador' };
const INSTRUCTOR = { id: 2, nombres: 'Laura', apellidos: 'Gómez', rol: 'Instructor' };
const APRENDIZ = { id: 4, nombres: 'Carlos', apellidos: 'Herrera', rol: 'Aprendiz' };
const PROYECTO = { id_proyecto: 1, nombre: 'SGP SENA', instructor: 'Laura Gómez', estado: 'Activo', porcentaje_avance: '40.00', descripcion: 'Gestión de proyectos formativos' };
const TAREA = { id_tarea: 10, titulo: 'Diseñar login', estado: 'Pendiente', prioridad: 'Alta', asignado_nombre: 'Carlos Herrera' };

function abrirProyecto(usuario) {
  return renderConSesion(
    <Routes><Route path="/proyectos/:id" element={<ProyectoDetallePage />} /></Routes>,
    { usuario, ruta: '/proyectos/1' },
  );
}

beforeAll(() => {
  // jsdom no implementa scrollIntoView (la pestaña Mensajes baja al último mensaje)
  Element.prototype.scrollIntoView = vi.fn();
});

beforeEach(() => {
  vi.clearAllMocks();
  for (const servicio of Object.values(api)) {
    for (const funcion of Object.values(servicio)) funcion.mockImplementation(vacio);
  }
  api.proyectosService.getById.mockResolvedValue({ data: { data: PROYECTO } });
});

describe('ProyectoDetallePage', () => {
  it('should open the project for an apprentice even if the users endpoint answers 403', async () => {
    // Arrange: un aprendiz no puede listar usuarios; antes eso tumbaba toda la página
    api.usuariosService.getAll.mockRejectedValue({ response: { status: 403 } });

    // Act
    abrirProyecto(APRENDIZ);

    // Assert
    expect(await screen.findByRole('heading', { name: 'SGP SENA' })).toBeInTheDocument();
    expect(screen.getByText('Gestión de proyectos formativos')).toBeInTheDocument();
  });

  it('should show an error when the project cannot be loaded', async () => {
    api.proyectosService.getById.mockRejectedValue({ response: { status: 404 } });

    abrirProyecto(APRENDIZ);

    expect(await screen.findByText('No se pudo cargar el proyecto')).toBeInTheDocument();
  });

  it('should show the "Revisión" tab only to the administrator', async () => {
    const { unmount } = abrirProyecto(APRENDIZ);
    await screen.findByRole('heading', { name: 'SGP SENA' });
    expect(screen.queryByRole('button', { name: 'Revisión' })).not.toBeInTheDocument();
    unmount();

    abrirProyecto(ADMIN);

    expect(await screen.findByRole('button', { name: 'Revisión' })).toBeInTheDocument();
  });

  it('should let only the instructor create tasks and change their state', async () => {
    api.tareasService.getByProyecto.mockResolvedValue({ data: { data: [TAREA] } });
    api.tareasService.update.mockResolvedValue({ data: { success: true } });
    const user = userEvent.setup();
    abrirProyecto(INSTRUCTOR);

    await user.click(await screen.findByRole('button', { name: 'Tareas' }));
    await user.selectOptions(screen.getByDisplayValue('Pendiente'), 'En curso');

    expect(screen.getByRole('button', { name: '+ Nueva tarea' })).toBeInTheDocument();
    expect(api.tareasService.update).toHaveBeenCalledWith(10, { estado: 'En curso' });
  });

  it('should not let the apprentice create tasks', async () => {
    api.tareasService.getByProyecto.mockResolvedValue({ data: { data: [TAREA] } });
    const user = userEvent.setup();
    abrirProyecto(APRENDIZ);

    await user.click(await screen.findByRole('button', { name: 'Tareas' }));

    expect(screen.getByText('Diseñar login')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '+ Nueva tarea' })).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('should send a message and let only its author edit it', async () => {
    const propio = { id_mensaje: 1, id_remitente: 4, remitente_nombre: 'Carlos Herrera', contenido: 'Subí el avance', fecha_envio: '2026-10-20T15:00:00Z' };
    const ajeno = { id_mensaje: 2, id_remitente: 2, remitente_nombre: 'Laura Gómez', contenido: 'Revisado', fecha_envio: '2026-10-20T16:00:00Z' };
    api.mensajesService.create.mockResolvedValue({ data: { success: true } });
    const user = userEvent.setup();
    abrirProyecto(APRENDIZ);
    await user.click(await screen.findByRole('button', { name: 'Mensajes' }));
    api.mensajesService.getByProyecto.mockResolvedValue({ data: { data: [propio, ajeno] } });

    await user.type(screen.getByPlaceholderText('Escribe un mensaje…'), 'Subí el avance');
    await user.click(screen.getByRole('button', { name: /Enviar/ }));

    expect(api.mensajesService.create).toHaveBeenCalledWith({ contenido: 'Subí el avance', id_proyecto: '1' });
    expect(await screen.findByText('Revisado')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Editar/ })).toHaveLength(1);
  });

  it('should tell the user why a message with forbidden words was not sent', async () => {
    api.mensajesService.create.mockRejectedValue({ response: { status: 400, data: { message: 'Tu mensaje contiene lenguaje no permitido y no fue enviado. Se generó una alerta en tu cuenta.' } } });
    const user = userEvent.setup();
    abrirProyecto(APRENDIZ);
    await user.click(await screen.findByRole('button', { name: 'Mensajes' }));

    await user.type(screen.getByPlaceholderText('Escribe un mensaje…'), 'eres un idiota');
    await user.click(screen.getByRole('button', { name: /Enviar/ }));

    const alerta = await screen.findByText(/lenguaje no permitido/);
    expect(within(alerta.closest('form')).getByPlaceholderText('Escribe un mensaje…')).toHaveValue('eres un idiota');
  });
});

describe('motivoNoDisponible (agregar miembro)', () => {
  it('should block apprentices without program or with 2 active projects', async () => {
    const { motivoNoDisponible } = await import('../src/pages/ProyectoDetallePage.jsx');
    expect(motivoNoDisponible({ programa_formacion: 'ADSO', proyectos_activos: 1 })).toBeNull();
    expect(motivoNoDisponible({ programa_formacion: 'ADSO', proyectos_activos: 2 })).toBe('ya tiene el máximo de proyectos');
    expect(motivoNoDisponible({ programa_formacion: '', proyectos_activos: 0 })).toBe('sin programa asignado');
  });
});
