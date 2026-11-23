import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import LoginPage from '../src/pages/LoginPage.jsx';
import { authService, fasesService, proyectosService } from '../src/services/api.js';
import { renderConSesion } from './render-con-sesion.jsx';

// Doble HTTP con MSW que reproduce fielmente las respuestas reales del backend de SGP
const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  localStorage.clear();
});
afterAll(() => server.close());

async function intentarLogin(correo, contrasena) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Correo electrónico'), correo);
  await user.type(screen.getByLabelText('Contraseña', { exact: true }), contrasena);
  await user.click(screen.getByRole('button', { name: 'Ingresar' }));
}

describe('respuestas reales del backend: autenticación y errores de negocio', () => {
  // Caso 1: Login 401 cuando el usuario no existe o está inactivo
  it('should show "Credenciales inválidas o usuario inactivo" when the email does not exist in backend', async () => {
    // Arrange: respuesta real de backend/src/controllers/auth.controller.js (línea 24)
    server.use(
      http.post('/api/v1/auth/login', () =>
        HttpResponse.json(
          { success: false, message: 'Credenciales inválidas o usuario inactivo' },
          { status: 401 }
        )
      )
    );
    renderConSesion(<LoginPage />);

    // Act
    await intentarLogin('noexiste@sgpsena.local', 'Clave123*');

    // Assert: la pantalla debe reflejar el mensaje real del backend
    expect(await screen.findByRole('alert')).toHaveTextContent('Credenciales inválidas o usuario inactivo');
  });

  // Caso 2: Login 401 cuando el usuario existe pero la contraseña no coincide
  it('should show "Credenciales inválidas" when the password does not match for an existing user', async () => {
    // Arrange: respuesta real de backend/src/controllers/auth.controller.js (línea 25)
    server.use(
      http.post('/api/v1/auth/login', () =>
        HttpResponse.json(
          { success: false, message: 'Credenciales inválidas' },
          { status: 401 }
        )
      )
    );
    renderConSesion(<LoginPage />);

    // Act
    await intentarLogin('admin.prueba@sgpsena.local', 'ClaveEquivocada');

    // Assert
    expect(await screen.findByRole('alert')).toHaveTextContent('Credenciales inválidas');
  });

  // Caso 3 (Semana 6): 409 al intentar eliminar una fase que todavía tiene entregables
  it('should reject with 409 and deliverable count when deleting a phase with deliverables', async () => {
    // Arrange: respuesta real de backend/src/controllers/fases.controller.js (línea 113)
    server.use(
      http.delete('/api/v1/fases/5', () =>
        HttpResponse.json(
          {
            success: false,
            message: 'No se puede eliminar la fase: tiene 3 entregable(s). Elimínalos primero.',
          },
          { status: 409 }
        )
      )
    );

    // Act
    const error = await fasesService.remove(5).catch((err) => err);

    // Assert
    expect(error.response.status).toBe(409);
    expect(error.response.data.success).toBe(false);
    expect(error.response.data.message).toBe(
      'No se puede eliminar la fase: tiene 3 entregable(s). Elimínalos primero.'
    );
  });

  // Caso 4 (Semana 6): 404 al crear un proyecto con un instructor inexistente o inactivo
  it('should reject with 404 and "Instructor no encontrado o inactivo" when instructor is not found', async () => {
    // Arrange: respuesta real de backend/src/controllers/proyectos.controller.js (línea 45)
    server.use(
      http.post('/api/v1/proyectos', () =>
        HttpResponse.json(
          { success: false, message: 'Instructor no encontrado o inactivo' },
          { status: 404 }
        )
      )
    );

    // Act
    const error = await proyectosService
      .create({
        nombre: 'Proyecto Formativo',
        fecha_inicio: '2026-03-01',
        id_instructor: 99999,
      })
      .catch((err) => err);

    // Assert
    expect(error.response.status).toBe(404);
    expect(error.response.data.message).toBe('Instructor no encontrado o inactivo');
  });

  // Caso 5 (Semana 6): 400 cuando el responsable asignado no es un instructor
  it('should reject with 400 and "El responsable del proyecto debe ser un instructor" when assigning apprentice as manager', async () => {
    // Arrange: respuesta real de backend/src/controllers/proyectos.controller.js (línea 48)
    server.use(
      http.post('/api/v1/proyectos', () =>
        HttpResponse.json(
          { success: false, message: 'El responsable del proyecto debe ser un instructor' },
          { status: 400 }
        )
      )
    );

    // Act
    const error = await proyectosService
      .create({
        nombre: 'Proyecto Formativo',
        fecha_inicio: '2026-03-01',
        id_instructor: 4, // Rol aprendiz
      })
      .catch((err) => err);

    // Assert
    expect(error.response.status).toBe(400);
    expect(error.response.data.message).toBe('El responsable del proyecto debe ser un instructor');
  });
});
