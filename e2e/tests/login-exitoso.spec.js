import { expect, test } from './support/fixtures.js';

test('should show the dashboard greeting after login with valid credentials', async ({ page, api }) => {
  // Arrange: la cuenta se crea por el API en cada corrida (la suite no depende del seed)
  const aprendiz = await api.crearAprendiz();
  await page.goto('/login');

  // Act
  await page.getByLabel('Correo electrónico').fill(aprendiz.correo);
  await page.getByLabel('Contraseña', { exact: true }).fill('Sena2026*');
  await page.getByRole('button', { name: 'Ingresar' }).click();

  // Assert
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: new RegExp(`Hola, ${aprendiz.nombres}`) })).toBeVisible();
});
