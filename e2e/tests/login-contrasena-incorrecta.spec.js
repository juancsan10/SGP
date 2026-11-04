import { expect, test } from '@playwright/test';

test('should show an error and stay on login when the password is wrong', async ({ page }) => {
  // Arrange
  await page.goto('/login');

  // Act
  await page.getByLabel('Correo electrónico').fill('carlos.herrera@sgpsena.local');
  await page.getByLabel('Contraseña', { exact: true }).fill('ClaveEquivocada123');
  await page.getByRole('button', { name: 'Ingresar' }).click();

  // Assert: el backend responde 401 y el formulario muestra su mensaje
  await expect(page.getByRole('alert')).toHaveText('Credenciales inválidas');
  await expect(page).toHaveURL(/\/login$/);
});
