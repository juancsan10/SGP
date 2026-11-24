import { expect, test, unico } from './support/fixtures.js';
import { PaginaEquipo } from './pages/equipo.page.js';

// Flujo crítico 3 (Juan Manuel): el instructor agrega un aprendiz al equipo.
// Por qué es crítico: sin equipo, el aprendiz no ve el proyecto ni sus tareas:
// es el paso que conecta al instructor con los aprendices.
test.describe('Flujo: el instructor agrega un aprendiz al equipo', () => {
  let instructor;
  let proyecto;
  let aprendiz;

  test.beforeEach(async ({ page, api, entrarComo }) => {
    // Datos por el API, con valores únicos para cada test
    instructor = await api.crearInstructor();
    proyecto = await api.crearProyecto(instructor);
    aprendiz = await api.crearAprendiz();
    await entrarComo(page, instructor);
  });

  test('should add an apprentice to the team and show them in the members list', async ({ page, api }) => {
    // Arrange
    const equipo = new PaginaEquipo(page);
    await equipo.abrir(proyecto.id_proyecto);
    await equipo.abrirFormulario();

    // Act
    await equipo.seleccionarAprendiz(aprendiz.id);
    await equipo.botonGuardar.click();

    // Assert: lo que ve la persona…
    await expect(equipo.dialogo).toBeHidden();
    const nombreCompleto = `${aprendiz.nombres} ${aprendiz.apellidos}`;
    await expect(page.getByText(nombreCompleto)).toBeVisible();

    // …y lo que quedó guardado en base de datos
    const guardados = await api.equipoDe(instructor, proyecto.id_proyecto);
    expect(guardados.some((m) => m.id_usuario === aprendiz.id)).toBe(true);
  });

  test('should show the 409 error in the modal when the apprentice was already added to the project', async ({ page, api }) => {
    // Arrange
    const equipo = new PaginaEquipo(page);
    await equipo.abrir(proyecto.id_proyecto);
    await equipo.abrirFormulario();
    await equipo.seleccionarAprendiz(aprendiz.id);

    // El aprendiz es vinculado concurrentemente antes de enviar el formulario
    await api.agregarAlEquipo(instructor, proyecto.id_proyecto, aprendiz);

    // Act
    await equipo.botonGuardar.click();

    // Assert: el backend responde 409 y la alerta muestra el mensaje correspondiente
    await expect(equipo.alertaError).toHaveText('El usuario ya pertenece a este proyecto');
    await expect(equipo.dialogo).toBeVisible();
  });

  test('should not show the "+ Agregar miembro" button to an apprentice', async ({ page, api, entrarComo }) => {
    // Arrange: el aprendiz ya forma parte del equipo y entra al proyecto
    await api.agregarAlEquipo(instructor, proyecto.id_proyecto, aprendiz);
    await entrarComo(page, aprendiz);

    const equipo = new PaginaEquipo(page);
    await equipo.abrir(proyecto.id_proyecto);

    // Assert: un aprendiz no tiene permisos para agregar miembros
    await expect(equipo.botonAbrirFormulario).toBeHidden();
  });

  // Parte 3: doble envío. La respuesta del POST se retrasa para que el segundo clic llegue
  // mientras la primera petición sigue en vuelo, como pasa con una red lenta.
  test('should send a single POST and add the apprentice once on a double click', async ({ page, api }) => {
    const equipo = new PaginaEquipo(page);
    let posts = 0;
    await page.route('**/api/v1/equipos', async (route) => {
      if (route.request().method() !== 'POST') return route.continue();
      posts += 1;
      await new Promise((listo) => setTimeout(listo, 800));
      return route.continue();
    });

    await equipo.abrir(proyecto.id_proyecto);
    await equipo.abrirFormulario();
    await equipo.seleccionarAprendiz(aprendiz.id);

    await equipo.botonGuardar.dblclick();

    await expect(equipo.dialogo).toBeHidden();
    expect(posts).toBe(1);

    const guardados = await api.equipoDe(instructor, proyecto.id_proyecto);
    expect(guardados.filter((m) => m.id_usuario === aprendiz.id)).toHaveLength(1);
  });
});
