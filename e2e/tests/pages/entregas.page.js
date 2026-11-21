// Objeto de página de /entregas (vista del aprendiz): solo pasos, sin aserciones
export class PaginaEntregas {
  constructor(page) {
    this.page = page;
    this.dialogo = page.getByRole('dialog');
    this.comentario = this.dialogo.getByLabel('Comentario');
    this.archivo = this.dialogo.locator('#entrega-archivo');
    this.enviarSinArchivo = this.dialogo.getByRole('button', { name: 'Enviar sin archivo' });
  }

  async abrir() {
    await this.page.goto('/entregas');
  }

  async abrirEntregaDe(tituloTarea) {
    await this.page.getByRole('row', { name: new RegExp(tituloTarea) })
      .getByRole('button', { name: /Entregar \/ corregir/ }).click();
  }

  async subir(nombre, mimeType, contenido = '%PDF-1.4 avance') {
    await this.archivo.setInputFiles({ name: nombre, mimeType, buffer: Buffer.from(contenido) });
  }
}
