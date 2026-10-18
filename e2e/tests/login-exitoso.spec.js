import { expect, test } from '@playwright/test';

// Cuenta de demo que crea backend/database/seed.js (no es un usuario real)
const APRENDIZ = { correo: 'carlos.herrera@sgpsena.local', contrasena: 'Sena2026*' };

test('should show the dashboard greeting after login with valid credentials', async ({ page }) => {
  // Arrange
  await page.goto('/login');

  // Act
  await page.getByLabel('Correo electrónico').fill(APRENDIZ.correo);
  await page.getByLabel('Contraseña', { exact: true }).fill(APRENDIZ.contrasena);
  await page.getByRole('button', { name: 'Ingresar' }).click();

  // Assert
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: /Hola, Carlos Andrés/ })).toBeVisible();
});
