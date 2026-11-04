import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import UsuariosPage from '../src/pages/UsuariosPage.jsx';
import { renderConSesion } from './render-con-sesion.jsx';
import { usuariosService, authService } from '../src/services/api.js';

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

const INSTRUCTOR_LOGUEADO = { id: 2, nombres: 'Laura', apellidos: 'Gómez', rol: 'Instructor' };

const USUARIOS_MOCK = [
  {
    id_usuario: 1,
    nombres: 'Carlos Andrés',
    apellidos: 'Herrera Gómez',
    correo: 'carlos.herrera@sgpsena.local',
    identificacion: '1098765432',
    rol: 'Aprendiz',
    activo: 1,
    ficha: '2694123',
  },
  {
    id_usuario: 2,
    nombres: 'Laura',
    apellidos: 'Gómez',
    correo: 'laura.gomez@sgpsena.local',
    identificacion: '98765432',
    rol: 'Instructor',
    activo: 1,
  },
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe('UsuariosPage', () => {
  it('renderiza la lista de usuarios y encabezados principales', async () => {
    vi.mocked(usuariosService.getAll).mockResolvedValueOnce({
      data: {
        data: USUARIOS_MOCK,
        meta: { total: 2, limit: 10, offset: 0 },
      },
    });

    renderConSesion(<UsuariosPage />, { usuario: INSTRUCTOR_LOGUEADO, ruta: '/usuarios' });

    expect(await screen.findByRole('heading', { name: 'Usuarios' })).toBeInTheDocument();
    expect(screen.getByText('Carlos Andrés Herrera Gómez')).toBeInTheDocument();
    expect(screen.getByText('laura.gomez@sgpsena.local')).toBeInTheDocument();
  });

  it('permite abrir el modal de nuevo usuario y valida cédula inválida al crear', async () => {
    const user = userEvent.setup();
    vi.mocked(usuariosService.getAll).mockResolvedValue({
      data: { data: USUARIOS_MOCK, meta: { total: 2, limit: 10, offset: 0 } },
    });

    renderConSesion(<UsuariosPage />, { usuario: INSTRUCTOR_LOGUEADO, ruta: '/usuarios' });

    const btnNuevo = await screen.findByRole('button', { name: /Nuevo instructor/i });
    await user.click(btnNuevo);

    expect(screen.getByText('Nuevo instructor')).toBeInTheDocument();

    // Rellenamos datos con cédula inválida (4 dígitos)
    await user.type(screen.getByLabelText(/Nombres \*/i), 'Pedro');
    await user.type(screen.getByLabelText(/Apellidos \*/i), 'Pérez');
    await user.type(screen.getByLabelText(/Correo electrónico \*/i), 'pedro@sena.edu.co');
    await user.type(screen.getByLabelText(/Identificación \(cc\)/i), '1234');
    await user.type(screen.getByLabelText(/Contraseña temporal \*/i), 'Sena2026*');

    await user.click(screen.getByRole('button', { name: 'Crear instructor' }));

    // No debe llamar a authService.createUser con cédula inválida
    expect(authService.createUser).not.toHaveBeenCalled();
    expect(await screen.findByText(/La identificación \(cc\) debe tener entre 5 y 15 dígitos/i)).toBeInTheDocument();
  });

  it('permite crear el usuario correctamente cuando los datos son válidos', async () => {
    const user = userEvent.setup();
    vi.mocked(usuariosService.getAll).mockResolvedValue({
      data: { data: USUARIOS_MOCK, meta: { total: 2, limit: 10, offset: 0 } },
    });
    vi.mocked(authService.createUser).mockResolvedValueOnce({
      data: { success: true, message: 'Usuario creado' },
    });

    renderConSesion(<UsuariosPage />, { usuario: INSTRUCTOR_LOGUEADO, ruta: '/usuarios' });

    const btnNuevo = await screen.findByRole('button', { name: /Nuevo instructor/i });
    await user.click(btnNuevo);

    await user.type(screen.getByLabelText(/Nombres \*/i), 'Pedro');
    await user.type(screen.getByLabelText(/Apellidos \*/i), 'Pérez');
    await user.type(screen.getByLabelText(/Correo electrónico \*/i), 'pedro@sena.edu.co');
    await user.type(screen.getByLabelText(/Identificación \(cc\)/i), '12345678');
    await user.type(screen.getByLabelText(/Contraseña temporal \*/i), 'Sena2026*');

    await user.click(screen.getByRole('button', { name: 'Crear instructor' }));

    await waitFor(() => {
      expect(authService.createUser).toHaveBeenCalledWith(expect.objectContaining({
        nombres: 'Pedro',
        apellidos: 'Pérez',
        correo: 'pedro@sena.edu.co',
        identificacion: '12345678',
      }));
    });
  });
});
