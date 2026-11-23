// Objeto de página de la pestaña Equipo en /proyectos/:id: solo pasos, sin aserciones (las hace cada test)
export class PaginaEquipo {
  constructor(page) {
    this.page = page;
    this.pestañaEquipo = page.getByRole('button', { name: 'Equipo' });
    this.botonAbrirFormulario = page.getByRole('button', { name: '+ Agregar miembro' });
    this.dialogo = page.getByRole('dialog', { name: 'Agregar miembro al equipo' });
    this.comboAprendiz = this.dialogo.getByLabel('Aprendiz *');
    this.botonGuardar = this.dialogo.getByRole('button', { name: 'Agregar miembro' });
    this.alertaError = this.dialogo.getByRole('alert');
  }

  async abrir(idProyecto) {
    await this.page.goto(`/proyectos/${idProyecto}`);
    await this.pestañaEquipo.click();
  }

  async abrirFormulario() {
    await this.botonAbrirFormulario.click();
  }

  async seleccionarAprendiz(idUsuario) {
    await this.comboAprendiz.selectOption(String(idUsuario));
  }
}
