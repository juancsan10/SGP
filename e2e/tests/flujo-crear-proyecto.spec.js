import { enDias, expect, test, unico } from './support/fixtures.js';
import { PaginaProyectos } from './pages/proyectos.page.js';

// Flujo crítico 1 (Rubiel): el instructor crea un proyecto.
// Por qué es crítico: sin proyecto no hay equipo, fases, tareas ni entregas; es lo primero
// que hace un instructor y lo primero que se muestra en la sustentación.
test.describe('Flujo: el instructor crea un proyecto', () => {
  let instructor;

  test.beforeEach(async ({ page, api, entrarComo }) => {
    // Datos por el API, con valores únicos: un instructor propio para cada test
    instructor = await api.crearInstructor();
    await entrarComo(page, instructor);
  });

  test('should create the project and show it in the list as "En Planificación"', async ({ page, api }) => {
    // Arrange
    const proyectos = new PaginaProyectos(page);
    const nombre = unico('Inventario de la ficha');
    await proyectos.abrir();
    await proyectos.abrirFormulario();

    // Act
    await proyectos.llenar({ nombre, inicio: enDias(1), fin: enDias(90) });
    await proyectos.botonCrear.click();

    // Assert: lo que ve la persona…
    await expect(proyectos.dialogo).toBeHidden();
    await expect(page.getByText(nombre)).toBeVisible();
    await expect(page.getByText('1 proyecto registrado')).toBeVisible();
    // …y lo que quedó guardado
    const guardados = await api.proyectosDe(instructor);
    expect(guardados.map((p) => [p.nombre, p.estado])).toEqual([[nombre, 'En Planificación']]);
  });

  test('should show the RN-004 error and keep the form open when the project lasts more than 6 months', async ({ page, api }) => {
    const proyectos = new PaginaProyectos(page);
    await proyectos.abrir();
    await proyectos.abrirFormulario();

    await proyectos.llenar({ nombre: unico('Proyecto muy largo'), inicio: enDias(1), fin: enDias(240) });
    await proyectos.botonCrear.click();

    await expect(proyectos.dialogo.getByRole('alert')).toHaveText('RN-004: Los proyectos deben durar entre 1 y 6 meses');
    await expect(proyectos.dialogo).toBeVisible();
    expect(await api.proyectosDe(instructor)).toEqual([]);
  });

  // Parte 3: doble envío. La respuesta del POST se retrasa para que el segundo clic llegue
  // mientras la primera petición sigue en vuelo, como pasa con una red lenta.
  test('should send a single POST and create a single project on a double click', async ({ page, api }) => {
    const proyectos = new PaginaProyectos(page);
    let posts = 0;
    await page.route('**/api/v1/proyectos', async (route) => {
      if (route.request().method() !== 'POST') return route.continue();
      posts += 1;
      await new Promise((listo) => setTimeout(listo, 800));
      return route.continue();
    });
    await proyectos.abrir();
    await proyectos.abrirFormulario();
    await proyectos.llenar({ nombre: unico('Doble clic'), inicio: enDias(1), fin: enDias(90) });

    await proyectos.botonCrear.dblclick();

    await expect(proyectos.dialogo).toBeHidden();
    expect(posts).toBe(1);
    expect(await api.proyectosDe(instructor)).toHaveLength(1);
  });
});
