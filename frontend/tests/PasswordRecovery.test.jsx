import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import PasswordRecovery from '../src/components/PasswordRecovery.jsx';

// Aquí NO se usa vi.mock: el componente llama al cliente real (services/api.js) y MSW hace de
// backend (FAKE a nivel HTTP). Así el test cubre también la URL, el verbo y el cuerpo que viajan.
const CORREO = 'carlos.herrera@sgpsena.local';
const peticiones = [];

const server = setupServer(
  http.post('/api/v1/auth/password-reset/request', async ({ request }) => {
    peticiones.push({ paso: 'request', cuerpo: await request.json() });
    return HttpResponse.json({
      success: true,
      message: 'Si el correo está registrado, enviamos un código de verificación a esa dirección.',
      data: { expires_in: 180, resend_in: 60 },
    });
  }),
  http.post('/api/v1/auth/password-reset/verify', async ({ request }) => {
    peticiones.push({ paso: 'verify', cuerpo: await request.json() });
    return HttpResponse.json({ success: true, data: { reset_session: 'sesion-123', session_expires_in: 300 } });
  }),
  http.post('/api/v1/auth/password-reset/confirm', async ({ request }) => {
    peticiones.push({ paso: 'confirm', cuerpo: await request.json() });
    return HttpResponse.json({ success: true, message: 'Contraseña actualizada correctamente.' });
  }),
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  peticiones.length = 0;
});
afterAll(() => server.close());

function renderRecuperacion(props = {}) {
  const onDone = vi.fn();
  render(<PasswordRecovery embedded onDone={onDone} {...props} />);
  return { onDone, user: userEvent.setup() };
}

async function escribirCodigo(user, codigo) {
  await user.click(screen.getByLabelText('Dígito 1'));
  await user.paste(codigo);
}

describe('PasswordRecovery', () => {
  it('should complete the three steps and send each one to the backend', async () => {
    // Arrange
    const { user } = renderRecuperacion();

    // Act: correo → código → nueva contraseña
    await user.type(screen.getByLabelText('Correo electrónico'), CORREO);
    await user.click(screen.getByRole('button', { name: 'Enviar código' }));
    await screen.findByLabelText('Dígito 1');
    await escribirCodigo(user, '123456');
    await user.type(await screen.findByLabelText('Nueva contraseña', {}, { timeout: 2000 }), 'Nueva2026x');
    await user.type(screen.getByLabelText('Confirmar contraseña'), 'Nueva2026x');
    await user.click(screen.getByRole('button', { name: 'Guardar contraseña' }));

    // Assert: ESTADO (la pantalla final) y COMPORTAMIENTO (lo que recibió el backend, en orden)
    expect(await screen.findByRole('heading', { name: '¡Contraseña actualizada!' })).toBeInTheDocument();
    expect(peticiones).toEqual([
      { paso: 'request', cuerpo: { correo: CORREO } },
      { paso: 'verify', cuerpo: { correo: CORREO, token: '123456' } },
      { paso: 'confirm', cuerpo: { correo: CORREO, reset_session: 'sesion-123', nueva_contrasena: 'Nueva2026x' } },
    ]);
  });

  it('should not call the backend when the email is not valid', async () => {
    const { user } = renderRecuperacion();

    await user.type(screen.getByLabelText('Correo electrónico'), 'carlos.herrera');
    await user.click(screen.getByRole('button', { name: 'Enviar código' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Escribe un correo válido.');
    expect(peticiones).toEqual([]);
  });

  it('should show the wait time when the backend answers 429', async () => {
    // Stub: el backend aplica el tiempo de espera entre códigos
    server.use(http.post('/api/v1/auth/password-reset/request', () => HttpResponse.json(
      { success: false, message: 'Espera 42 s para pedir otro código.', data: { retry_after: 42 } },
      { status: 429 },
    )));
    const { user } = renderRecuperacion({ initialEmail: CORREO });

    await user.click(screen.getByRole('button', { name: 'Enviar código' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Espera 42 s para pedir otro código.');
    expect(screen.getByRole('button', { name: /Reenviar en 4[12]s/ })).toBeDisabled();
  });

  it('should show the attempts left and clear the digits when the code is wrong', async () => {
    server.use(http.post('/api/v1/auth/password-reset/verify', () => HttpResponse.json(
      { success: false, message: 'Código incorrecto. Te quedan 4 intentos.', data: { attempts_left: 4, locked: false } },
      { status: 400 },
    )));
    const { user } = renderRecuperacion({ initialEmail: CORREO });
    await user.click(screen.getByRole('button', { name: 'Enviar código' }));
    await screen.findByLabelText('Dígito 1');

    await escribirCodigo(user, '999999');

    expect(await screen.findByRole('alert')).toHaveTextContent('Código incorrecto. Te quedan 4 intentos.');
    expect(screen.getByLabelText('Dígito 1')).toHaveValue('');
  });

  it('should block the code inputs when the backend locks the code', async () => {
    server.use(http.post('/api/v1/auth/password-reset/verify', () => HttpResponse.json(
      { success: false, message: 'Demasiados intentos. Solicita un código nuevo.', data: { locked: true } },
      { status: 400 },
    )));
    const { user } = renderRecuperacion({ initialEmail: CORREO });
    await user.click(screen.getByRole('button', { name: 'Enviar código' }));
    await screen.findByLabelText('Dígito 1');

    await escribirCodigo(user, '000000');

    expect(await screen.findByRole('alert')).toHaveTextContent('Demasiados intentos');
    expect(screen.getByLabelText('Dígito 1')).toBeDisabled();
  });

  it('should not send a password that does not match its confirmation', async () => {
    const { user } = renderRecuperacion({ initialEmail: CORREO });
    await user.click(screen.getByRole('button', { name: 'Enviar código' }));
    await screen.findByLabelText('Dígito 1');
    await escribirCodigo(user, '123456');

    await user.type(await screen.findByLabelText('Nueva contraseña', {}, { timeout: 2000 }), 'Nueva2026x');
    await user.type(screen.getByLabelText('Confirmar contraseña'), 'Nueva2026y');
    await user.click(screen.getByRole('button', { name: 'Guardar contraseña' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Las contraseñas no coinciden.');
    expect(peticiones.map((p) => p.paso)).toEqual(['request', 'verify']);
  });
});
