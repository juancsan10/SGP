import { expect, test } from './support/fixtures.js';

test('should show an error and stay on login when the password is wrong', async ({ page, api }) => {
  // Arrange: la cuenta se crea por el API en cada corrida (la suite no depende del seed)
  const aprendiz = await api.crearAprendiz();
  await page.goto('/login');

  // Act
  await page.getByLabel('Correo electrónico').fill(aprendiz.correo);
  await page.getByLabel('Contraseña', { exact: true }).fill('ClaveEquivocada123');
  await page.getByRole('button', { name: 'Ingresar' }).click();

  // Assert: el backend responde 401 y el formulario muestra su mensaje
  await expect(page.getByRole('alert')).toHaveText('Credenciales inválidas');
  await expect(page).toHaveURL(/\/login$/);
});
