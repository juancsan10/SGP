import { expect, test } from '@playwright/test';

test('should show an error and stay on login when the password is empty', async ({ page }) => {
  // Arrange
  await page.goto('/login');

  // Act
  await page.getByLabel('Correo electrónico').fill('carlos.herrera@sgpsena.local');
  await page.getByRole('button', { name: 'Ingresar' }).click();

  // Assert: validación de campos obligatorios en el cliente sin llamar al backend
  await expect(page.getByRole('alert')).toHaveText('Completa correo y contraseña.');
  await expect(page).toHaveURL(/\/login$/);
});
