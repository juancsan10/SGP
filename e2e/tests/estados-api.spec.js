import { expect, test } from '@playwright/test';

// Cuenta de aprendiz del seed
const APRENDIZ = { correo: 'carlos.herrera@sgpsena.local', contrasena: 'Sena2026*' };

// Helper para iniciar sesión con el backend real antes de navegar
async function iniciarSesionComoAprendiz(page) {
  await page.goto('/login');
  await page.getByLabel('Correo electrónico').fill(APRENDIZ.correo);
  await page.getByLabel('Contraseña', { exact: true }).fill(APRENDIZ.contrasena);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test('should show "Sin proyectos" when the API returns an empty list', async ({ page }) => {
  // Arrange
  // Doble: STUB de la respuesta HTTP con page.route.
  // Por qué: No se toca el backend real, ya que con datos reales sería difícil
  // dejar a un usuario sin proyectos asignados solo para esta prueba.
  // Tipo de verificación: ESTADO. Verifica que la interfaz renderice el estado
  // visual "Sin proyectos" cuando la colección de proyectos devuelta por el API está vacía.
  await page.route('**/api/v1/proyectos', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [] }),
    })
  );

  await iniciarSesionComoAprendiz(page);

  // Act
  await page.goto('/proyectos');

  // Assert
  await expect(page.getByText('Sin proyectos')).toBeVisible();
  await expect(page.getByText('0 proyectos registrados')).toBeVisible();
});

test('should show empty state gracefully instead of a blank screen when the backend fails with 500', async ({ page }) => {
  // Arrange
  // Doble: STUB de la respuesta HTTP con page.route simulando status 500.
  // Por qué: Simula una caída o error interno del servidor sin tener que apagar
  // el servidor real o provocar fallos destructivos en la base de datos.
  // Tipo de verificación: ESTADO. Verifica que ante una caída del backend (500)
  // la aplicación no quede en pantalla en blanco ni lance un error no capturado,
  // sino que muestre el encabezado y el estado vacío ("Sin proyectos") con sentido.
  await page.route('**/api/v1/proyectos', (route) =>
    route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ success: false, message: 'Error interno del servidor' }),
    })
  );

  await iniciarSesionComoAprendiz(page);

  // Act
  await page.goto('/proyectos');

  // Assert
  await expect(page.getByRole('heading', { name: 'Proyectos' })).toBeVisible();
  await expect(page.getByText('Sin proyectos')).toBeVisible();
});

test('should display validation error in login and call the endpoint exactly once', async ({ page }) => {
  // Arrange
  // Doble: STUB y SPY con page.route.
  // Por qué: Simula un error 400 de validación desde el servidor y cuenta las peticiones
  // recibidas para comprobar que el cliente no genera llamadas repetidas ni duplicadas.
  // Tipo de verificación: COMPORTAMIENTO. Verifica que la petición de login se ejecute
  // exactamente una sola vez, que el usuario permanezca en /login y que la alerta
  // muestre el mensaje de error específico retornado por el API.
  let llamadasLogin = 0;
  await page.route('**/api/v1/auth/login', (route) => {
    llamadasLogin++;
    return route.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({
        success: false,
        message: 'Error de validación',
        errors: [{ campo: 'correo', mensaje: 'El correo no tiene un formato válido' }],
      }),
    });
  });

  await page.goto('/login');

  // Act
  await page.getByLabel('Correo electrónico').fill('correo-no-valido');
  await page.getByLabel('Contraseña', { exact: true }).fill('Sena2026*');
  await page.getByRole('button', { name: 'Ingresar' }).click();

  // Assert
  await expect(page.getByRole('alert')).toHaveText('El correo no tiene un formato válido');
  await expect(page).toHaveURL(/\/login$/);
  expect(llamadasLogin).toBe(1);
});

test('should handle network connection failure when request is aborted', async ({ page }) => {
  // Arrange
  // Doble: FALLO DE RED SIMULADO con route.abort('failed').
  // Por qué: Permite verificar la resiliencia de la interfaz ante pérdidas repentinas
  // de conectividad a nivel de red sin desconectar la interfaz de red del equipo anfitrión.
  // Tipo de verificación: ESTADO. Verifica que ante una desconexión total de red la UI
  // no colapse y conserve la estructura visible de la vista con el estado vacío.
  await page.route('**/api/v1/proyectos', (route) => route.abort('failed'));

  await iniciarSesionComoAprendiz(page);

  // Act
  await page.goto('/proyectos');

  // Assert
  await expect(page.getByRole('heading', { name: 'Proyectos' })).toBeVisible();
  await expect(page.getByText('Sin proyectos')).toBeVisible();
});
