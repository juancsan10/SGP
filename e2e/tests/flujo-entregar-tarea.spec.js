import { expect, test, unico } from './support/fixtures.js';
import { PaginaEntregas } from './pages/entregas.page.js';

// Flujo crítico 2 (Juan Carlos): el aprendiz entrega una tarea.
// Por qué es crítico: es lo que el aprendiz hace todos los días y de lo que depende su
// calificación; si falla, el instructor no recibe nada que revisar.
test.describe('Flujo: el aprendiz entrega una tarea', () => {
  let aprendiz;
  let tarea;

  test.beforeEach(async ({ page, api, entrarComo }) => {
    // Todos los datos por el API, únicos para este test: instructor, proyecto, equipo y tarea
    const instructor = await api.crearInstructor();
    aprendiz = await api.crearAprendiz();
    const { id_proyecto } = await api.crearProyecto(instructor);
    await api.agregarAlEquipo(instructor, id_proyecto, aprendiz);
    tarea = await api.crearTarea(instructor, id_proyecto, aprendiz, { titulo: unico('Diagrama de clases') });
    await entrarComo(page, aprendiz);
  });

  test('should upload the PDF and leave the delivery as "Entregada"', async ({ page, api }) => {
    // Arrange
    const entregas = new PaginaEntregas(page);
    await entregas.abrir();
    await entregas.abrirEntregaDe(tarea.titulo);

    // Act
    await entregas.subir('avance.pdf', 'application/pdf');

    // Assert: se cierra el diálogo y, al volver a abrirlo, la entrega aparece como Entregada
    await expect(entregas.dialogo).toBeHidden();
    await entregas.abrirEntregaDe(tarea.titulo);
    await expect(entregas.dialogo.getByText('Estado: Entregada')).toBeVisible();
    const entrega = await api.entregaDe(aprendiz, tarea.id_tarea);
    expect(entrega.estado).toBe('Entregada');
    expect(entrega.ruta_archivo).toMatch(/\.pdf$/);
  });

  test('should reject a file that is not PDF, JPG, PNG or WEBP without sending it', async ({ page, api }) => {
    const entregas = new PaginaEntregas(page);
    await entregas.abrir();
    await entregas.abrirEntregaDe(tarea.titulo);

    await entregas.subir('virus.exe', 'application/x-msdownload', 'MZ');

    await expect(entregas.dialogo.getByRole('alert')).toHaveText('Solo se permiten archivos PDF, JPG, PNG o WEBP');
    expect(await api.entregaDe(aprendiz, tarea.id_tarea)).toBeNull();
  });

  // Parte 3: red lenta. Mientras llega la entrega guardada, el aprendiz ya puede escribir.
  test('should not lose the comment typed while the saved delivery is still loading', async ({ page }) => {
    const entregas = new PaginaEntregas(page);
    await page.route(`**/api/v1/entregas/tarea/${tarea.id_tarea}`, async (route) => {
      if (route.request().method() !== 'GET') return route.continue();
      await new Promise((listo) => setTimeout(listo, 1500));
      return route.continue();
    });
    await entregas.abrir();
    const respuesta = page.waitForResponse(`**/api/v1/entregas/tarea/${tarea.id_tarea}`);

    await entregas.abrirEntregaDe(tarea.titulo);
    await expect(entregas.comentario).toBeEditable();
    await entregas.comentario.fill('Adjunto el avance del diagrama');
    await respuesta;

    await expect(entregas.comentario).toHaveValue('Adjunto el avance del diagrama');
  });

  // Parte 3: doble envío del formulario sin archivo, con el POST retrasado
  test('should send a single POST on a double click of "Enviar sin archivo"', async ({ page, api }) => {
    const entregas = new PaginaEntregas(page);
    let posts = 0;
    await page.route(`**/api/v1/entregas/tarea/${tarea.id_tarea}`, async (route) => {
      if (route.request().method() !== 'POST') return route.continue();
      posts += 1;
      await new Promise((listo) => setTimeout(listo, 800));
      return route.continue();
    });
    await entregas.abrir();
    await entregas.abrirEntregaDe(tarea.titulo);
    await expect(entregas.comentario).toBeEditable();
    await entregas.comentario.fill('Entrego por enlace');
    await entregas.dialogo.getByLabel('Enlace').fill('https://drive.google.com/avance');

    await entregas.enviarSinArchivo.dblclick();

    await expect(entregas.dialogo).toBeHidden();
    expect(posts).toBe(1);
    expect((await api.entregaDe(aprendiz, tarea.id_tarea)).url_entrega).toBe('https://drive.google.com/avance');
  });
});
