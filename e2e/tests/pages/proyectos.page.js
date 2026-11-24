// Objeto de página de /proyectos: solo pasos, sin aserciones (las hace cada test)
export class PaginaProyectos {
  constructor(page) {
    this.page = page;
    this.dialogo = page.getByRole('dialog', { name: 'Nuevo proyecto' });
    this.botonCrear = this.dialogo.getByRole('button', { name: 'Crear proyecto' });
  }

  async abrir() {
    await this.page.goto('/proyectos');
  }

  async abrirFormulario() {
    await this.page.getByRole('button', { name: '+ Nuevo proyecto' }).click();
  }

  async llenar({ nombre, inicio, fin }) {
    await this.dialogo.getByLabel('Nombre *').fill(nombre);
    await this.dialogo.getByLabel('Fecha inicio *').fill(inicio);
    if (fin) await this.dialogo.getByLabel('Fecha fin').fill(fin);
  }
}
