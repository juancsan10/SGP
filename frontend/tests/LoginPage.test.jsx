import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LoginPage from '../src/pages/LoginPage.jsx';
import { authService } from '../src/services/api.js';
import { renderConSesion } from './render-con-sesion.jsx';

// Stub del cliente HTTP: el test decide qué responde el backend
vi.mock('../src/services/api.js', () => ({
  authService: { login: vi.fn() },
  passwordService: { request: vi.fn() },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

async function ingresar(correo, contrasena) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Correo electrónico'), correo);
  if (contrasena) await user.type(screen.getByLabelText('Contraseña', { exact: true }), contrasena);
  await user.click(screen.getByRole('button', { name: 'Ingresar' }));
}

describe('LoginPage', () => {
  it('should not call the backend when the password is empty', async () => {
    renderConSesion(<LoginPage />);

    await ingresar('carlos@sena.edu.co', '');

    expect(screen.getByRole('alert')).toHaveTextContent('Completa correo y contraseña.');
    expect(authService.login).not.toHaveBeenCalled();
  });

  it('should show the message sent by the backend when the credentials are wrong', async () => {
    // Arrange
    authService.login.mockRejectedValueOnce({ response: { status: 401, data: { message: 'Credenciales inválidas' } } });
    renderConSesion(<LoginPage />);

    // Act
    await ingresar('carlos@sena.edu.co', 'otra');

    // Assert
    expect(await screen.findByRole('alert')).toHaveTextContent('Credenciales inválidas');
  });

  it('should save the token in the session after a successful login', async () => {
    authService.login.mockResolvedValueOnce({
      data: { data: { token: 'token-de-prueba', usuario: { id: 4, nombres: 'Carlos', rol: 'Aprendiz' } } },
    });
    renderConSesion(<LoginPage />);

    await ingresar('carlos@sena.edu.co', 'Sena2026*');

    expect(authService.login).toHaveBeenCalledWith({ correo: 'carlos@sena.edu.co', contrasena: 'Sena2026*' });
    expect(localStorage.getItem('sgp_token')).toBe('token-de-prueba');
  });

  it('should remember the email only when "Recuérdame" is checked', async () => {
    authService.login.mockResolvedValueOnce({ data: { data: { token: 't', usuario: { id: 4, rol: 'Aprendiz' } } } });
    renderConSesion(<LoginPage />);
    await userEvent.click(screen.getByRole('checkbox', { name: 'Recuérdame' }));

    await ingresar('carlos@sena.edu.co', 'Sena2026*');

    expect(localStorage.getItem('sgp_last_email')).toBe('carlos@sena.edu.co');
  });

  it('should show which field is wrong when the backend answers a validation error', async () => {
    authService.login.mockRejectedValueOnce({ response: { status: 400, data: {
      success: false, message: 'Error de validación',
      errors: [{ campo: 'correo', mensaje: 'El correo no tiene un formato válido' }],
    } } });
    renderConSesion(<LoginPage />);

    await ingresar('carlos.herrera', 'Sena2026*');

    expect(await screen.findByRole('alert')).toHaveTextContent('El correo no tiene un formato válido');
  });
});
