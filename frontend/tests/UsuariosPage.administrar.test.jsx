import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import UsuariosPage from '../src/pages/UsuariosPage.jsx';
import { renderConSesion } from './render-con-sesion.jsx';
import { passwordService, usuariosService } from '../src/services/api.js';

// Semana 8 (capa Front): ramas sin cubrir de UsuariosPage.jsx según el reporte de cobertura
// (50 % de líneas): búsqueda por cc, editar con sus validaciones, enlace de recuperación,
// activar / desactivar y el error de carga.
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

const ADMIN = { id: 1, nombres: 'Diana', apellidos: 'Ríos', rol: 'Administrador' };
const ANA = { id_usuario: 7, nombres: 'Ana', apellidos: 'Ruiz', correo: 'ana@sgpsena.local', identificacion: '1012345678', rol: 'Aprendiz', estado: 1 };
const LUIS = { id_usuario: 8, nombres: 'Luis', apellidos: 'Peña', correo: 'luis@sgpsena.local', identificacion: '1023456789', rol: 'Instructor', estado: 0 };
const JEFE = { id_usuario: 1, nombres: 'Diana', apellidos: 'Ríos', correo: 'admin@sgpsena.local', rol: 'Administrador', estado: 1 };

const lista = (data) => Promise.resolve({ data: { data, meta: { total: data.length, limit: 10, offset: 0 } } });

async function abrirComoAdmin(usuarios = [ANA, LUIS, JEFE]) {
  usuariosService.getAll.mockImplementation(() => lista(usuarios));
  const user = userEvent.setup();
  renderConSesion(<UsuariosPage />, { usuario: ADMIN });
  await screen.findByText('ana@sgpsena.local');
  return user;
}

async function abrirEdicion(user, nombre = /Ana/) {
  await user.click(within(screen.getByRole('row', { name: nombre })).getByRole('button', { name: '✏️ Editar' }));
  return screen.getByRole('dialog', { name: /Editar usuario/ });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('UsuariosPage: buscar por identificación', () => {
  it('should find a user by cc and role and show his data', async () => {
    const user = await abrirComoAdmin();
    usuariosService.buscarPorIdentificacion.mockResolvedValue({ data: { data: { ...ANA, estado: 0 } } });

    await user.type(screen.getByPlaceholderText('Ej. 1098765001'), '10123.45 678');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Rol a buscar' }), 'Aprendiz');
    await user.click(screen.getByRole('button', { name: 'Buscar' }));

    expect(usuariosService.buscarPorIdentificacion).toHaveBeenCalledWith('10123.45678', 'Aprendiz');
    expect(await screen.findByText('Identificación:')).toBeInTheDocument();
    expect(screen.getByText('Estado: Inactivo')).toBeInTheDocument();
  });

  it('should keep the search button disabled with less than 4 characters', async () => {
    const user = await abrirComoAdmin();

    await user.type(screen.getByPlaceholderText('Ej. 1098765001'), '101');

    expect(screen.getByRole('button', { name: 'Buscar' })).toBeDisabled();
  });

  it('should show the message of the API when nobody has that cc', async () => {
    const user = await abrirComoAdmin();
    usuariosService.buscarPorIdentificacion.mockRejectedValue({ response: { data: { message: 'Usuario no encontrado' } } });

    await user.type(screen.getByPlaceholderText('Ej. 1098765001'), '99999999');
    await user.click(screen.getByRole('button', { name: 'Buscar' }));

    expect(await screen.findByText('Usuario no encontrado')).toBeInTheDocument();
  });
});

describe('UsuariosPage: editar usuario', () => {
  it.each([
    ['a short name', 'A', 'ana@sgpsena.local', '1012345678', 'Nombres y apellidos deben tener entre 2 y 100 caracteres'],
    ['an invalid email', 'Ana', 'ana-sin-arroba', '1012345678', 'Ingresa un correo electrónico válido'],
    ['a cc with 3 digits', 'Ana', 'ana@sgpsena.local', '123', 'La identificación (cc) debe tener entre 5 y 15 dígitos, sin puntos ni espacios'],
  ])('should not save %s', async (_caso, nombres, correo, cc, mensaje) => {
    const user = await abrirComoAdmin();
    const dialogo = await abrirEdicion(user);

    const campoNombres = within(dialogo).getByDisplayValue('Ana');
    await user.clear(campoNombres);
    await user.type(campoNombres, nombres);
    const campoCorreo = within(dialogo).getByDisplayValue('ana@sgpsena.local');
    await user.clear(campoCorreo);
    await user.type(campoCorreo, correo);
    const campoCc = within(dialogo).getByDisplayValue('1012345678');
    await user.clear(campoCc);
    await user.type(campoCc, cc);
    dialogo.querySelector('form').noValidate = true;
    await user.click(within(dialogo).getByRole('button', { name: 'Guardar cambios' }));

    expect(await within(dialogo).findByText(mensaje)).toBeInTheDocument();
    expect(usuariosService.update).not.toHaveBeenCalled();
  });

  it('should save the changes, confirm them and reload the list', async () => {
    const user = await abrirComoAdmin();
    usuariosService.update.mockResolvedValue({ data: { success: true } });
    const dialogo = await abrirEdicion(user);

    await user.type(within(dialogo).getByDisplayValue('Ruiz'), ' Díaz');
    await user.click(within(dialogo).getByRole('button', { name: 'Guardar cambios' }));

    expect(usuariosService.update).toHaveBeenCalledWith(7, expect.objectContaining({ apellidos: 'Ruiz Díaz', correo: 'ana@sgpsena.local' }));
    expect(await within(dialogo).findByText('Usuario actualizado')).toBeInTheDocument();
    expect(usuariosService.getAll).toHaveBeenCalledTimes(2);
  });

  it('should show the message of the API when the update is rejected', async () => {
    const user = await abrirComoAdmin();
    usuariosService.update.mockRejectedValue({ response: { data: { message: 'El correo ya está registrado' } } });
    const dialogo = await abrirEdicion(user);

    await user.click(within(dialogo).getByRole('button', { name: 'Guardar cambios' }));

    expect(await within(dialogo).findByText('El correo ya está registrado')).toBeInTheDocument();
  });

  it('should generate the recovery link and show it to the Administrador', async () => {
    const user = await abrirComoAdmin();
    passwordService.request.mockResolvedValue({ data: { data: { reset_url: 'http://localhost:5173/reset?t=abc' } } });
    const dialogo = await abrirEdicion(user);

    await user.click(within(dialogo).getByRole('button', { name: '🔑 Generar enlace de recuperación' }));

    expect(passwordService.request).toHaveBeenCalledWith('ana@sgpsena.local');
    expect(await within(dialogo).findByText('Enlace generado: http://localhost:5173/reset?t=abc')).toBeInTheDocument();
  });

  it.each([
    ['without url in the answer', () => Promise.resolve({ data: { data: {} } }), 'Se generó el enlace de recuperación'],
    ['when the API fails', () => Promise.reject({ response: { data: { message: 'Demasiadas solicitudes' } } }), 'Demasiadas solicitudes'],
  ])('should explain the recovery link result %s', async (_caso, respuesta, mensaje) => {
    const user = await abrirComoAdmin();
    passwordService.request.mockImplementation(respuesta);
    const dialogo = await abrirEdicion(user);

    await user.click(within(dialogo).getByRole('button', { name: '🔑 Generar enlace de recuperación' }));

    expect(await within(dialogo).findByText(mensaje)).toBeInTheDocument();
  });
});

describe('UsuariosPage: activar y desactivar', () => {
  it('should protect the main Administrador account from being disabled or deleted', async () => {
    await abrirComoAdmin();

    const fila = screen.getByRole('row', { name: /admin@sgpsena.local/ });
    expect(within(fila).getByText('🔒 Cuenta principal')).toBeInTheDocument();
    expect(within(fila).queryByRole('button', { name: '⏸️ Desactivar' })).not.toBeInTheDocument();
  });

  it('should disable an active user after confirming', async () => {
    const user = await abrirComoAdmin();
    usuariosService.remove.mockResolvedValue({ data: { success: true } });

    await user.click(within(screen.getByRole('row', { name: /Ana/ })).getByRole('button', { name: '⏸️ Desactivar' }));
    expect(screen.getByText('¿Desactivar este usuario?')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Sí, desactivar' }));

    expect(usuariosService.remove).toHaveBeenCalledWith(7);
    await waitFor(() => expect(screen.queryByText('¿Desactivar este usuario?')).not.toBeInTheDocument());
  });

  it('should keep the confirmation open with the reason when activating fails', async () => {
    const user = await abrirComoAdmin();
    usuariosService.activar.mockRejectedValue({ response: { data: { message: 'No se puede activar: el rol fue eliminado' } } });

    await user.click(within(screen.getByRole('row', { name: /Luis/ })).getByRole('button', { name: '▶️ Activar' }));
    await user.click(screen.getByRole('button', { name: 'Sí, activar' }));

    expect(usuariosService.activar).toHaveBeenCalledWith(8);
    expect(await screen.findByText('No se puede activar: el rol fue eliminado')).toBeInTheDocument();
  });
});

describe('UsuariosPage: carga', () => {
  it('should show the error of the API when the list cannot be loaded', async () => {
    usuariosService.getAll.mockRejectedValue({ response: { data: { message: 'Token inválido o expirado' } } });

    renderConSesion(<UsuariosPage />, { usuario: ADMIN });

    expect(await screen.findByText('Token inválido o expirado')).toBeInTheDocument();
  });
});
