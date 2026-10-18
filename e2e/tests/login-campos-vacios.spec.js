import { expect, test } from '@playwright/test';

test('should ask to fill both fields when the password is empty', async ({ page }) => {
  // Arrange
  await page.goto('/login');

  // Act: escribe solo el correo y deja la contraseña vacía
  await page.getByLabel('Correo electrónico').fill('carlos.herrera@sgpsena.local');
  await page.getByRole('button', { name: 'Ingresar' }).click();

  // Assert: la validación es del frontend, no llega a llamar al backend
  await expect(page.getByRole('alert')).toHaveText('Completa correo y contraseña.');
  await expect(page).toHaveURL(/\/login$/);
});
