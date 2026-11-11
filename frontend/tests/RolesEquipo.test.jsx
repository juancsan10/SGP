import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CambiarRolModal, EtiquetaRol, SelectorRolEquipo } from '../src/components/RolesEquipo.jsx';
import { equiposService, rolesEquipoService } from '../src/services/api.js';
import { PALETA_ROLES, colorDeRol } from '../src/utils/rolesEquipo.js';

vi.mock('../src/services/api.js', () => ({
  rolesEquipoService: { getAll: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() },
  equiposService: { updateRol: vi.fn() },
}));

const ROLES = [
  { nombre: 'Desarrollador', color: '#2563eb', propio: false, id_rol_equipo: null },
  { nombre: 'Tester / QA', color: '#b45309', propio: false, id_rol_equipo: null },
  { nombre: 'Scrum master', color: '#7c3aed', propio: true, id_rol_equipo: 7 },
];

beforeEach(() => {
  vi.clearAllMocks();
  rolesEquipoService.getAll.mockResolvedValue({ data: { data: ROLES } });
});

// Envoltorio con estado, como lo usa el aviso de agregar miembro
function ConSelector({ inicial = { nombre: '', color: null }, onCambio = () => {} }) {
  const [valor, setValor] = useState(inicial);
  return (
    <>
      <span id="etq">Rol en el proyecto</span>
      <SelectorRolEquipo idEtiqueta="etq" valor={valor} onChange={(v) => { setValor(v); onCambio(v); }} />
    </>
  );
}

describe('colorDeRol', () => {
  it('should prefer the saved color, then the default role color, then a stable palette color', () => {
    expect(colorDeRol('Cualquiera', '#be185d')).toBe('#be185d');
    expect(colorDeRol('Desarrollador Backend', null)).toBe('#047857');
    const derivado = colorDeRol('Rol inventado', null);
    expect(PALETA_ROLES.map(p => p.color)).toContain(derivado);
    expect(colorDeRol('Rol inventado', null)).toBe(derivado);
    expect(colorDeRol('', null)).toBeNull();
  });
});

describe('EtiquetaRol', () => {
  it('should paint the chip with the role color', () => {
    render(<EtiquetaRol nombre="Tester / QA" color="#b45309" />);
    expect(screen.getByText('Tester / QA').style.getPropertyValue('--rol-color')).toBe('#b45309');
  });
});

describe('SelectorRolEquipo', () => {
  it('should list the roles as options and select one with its color', async () => {
    // Arrange
    const user = userEvent.setup();
    const onCambio = vi.fn();
    render(<ConSelector onCambio={onCambio} />);
    const grupo = await screen.findByRole('radiogroup', { name: 'Rol en el proyecto' });

    // Act
    await user.click(within(grupo).getByRole('radio', { name: 'Tester / QA' }));

    // Assert
    expect(onCambio).toHaveBeenLastCalledWith({ nombre: 'Tester / QA', color: '#b45309' });
    expect(within(grupo).getByRole('radio', { name: 'Tester / QA' })).toHaveAttribute('aria-checked', 'true');
  });

  it('should create a new role with the chosen color and select it', async () => {
    // Arrange
    const user = userEvent.setup();
    const onCambio = vi.fn();
    rolesEquipoService.create.mockResolvedValue({ data: {} });
    render(<ConSelector onCambio={onCambio} />);
    await screen.findByRole('radio', { name: 'Desarrollador' });

    // Act
    await user.click(screen.getByRole('button', { name: '+ Crear un rol nuevo' }));
    await user.type(screen.getByLabelText('Nuevo rol'), 'Product owner');
    await user.click(screen.getByRole('radio', { name: 'Rosa' }));
    await user.click(screen.getByRole('button', { name: 'Crear rol' }));

    // Assert
    expect(rolesEquipoService.create).toHaveBeenCalledWith('Product owner', '#be185d');
    expect(onCambio).toHaveBeenLastCalledWith({ nombre: 'Product owner', color: '#be185d' });
    expect(rolesEquipoService.getAll).toHaveBeenCalledTimes(2);
  });

  it('should edit an own role', async () => {
    // Arrange
    const user = userEvent.setup();
    rolesEquipoService.update.mockResolvedValue({ data: {} });
    render(<ConSelector />);
    await screen.findByText('Mis roles personalizados (1)');

    // Act
    await user.click(screen.getByText('Mis roles personalizados (1)'));
    await user.click(screen.getByRole('button', { name: 'Editar el rol Scrum master' }));
    const nombre = screen.getByLabelText('Nombre del rol');
    await user.clear(nombre);
    await user.type(nombre, 'Facilitador');
    await user.click(screen.getByRole('button', { name: 'Guardar rol' }));

    // Assert
    expect(rolesEquipoService.update).toHaveBeenCalledWith(7, 'Facilitador', '#7c3aed');
  });
});

describe('CambiarRolModal', () => {
  it('should save the new role of the member', async () => {
    // Arrange
    const user = userEvent.setup();
    const onGuardado = vi.fn();
    equiposService.updateRol.mockResolvedValue({ data: {} });
    render(<CambiarRolModal miembro={{ id_equipo: 9, nombre_usuario: 'Carlos Herrera', rol_en_equipo: 'Desarrollador', color_rol: null }}
      onClose={vi.fn()} onGuardado={onGuardado} />);
    const dialogo = screen.getByRole('dialog', { name: 'Rol de Carlos Herrera' });

    // Act
    await user.click(await within(dialogo).findByRole('radio', { name: 'Tester / QA' }));
    await user.click(within(dialogo).getByRole('button', { name: 'Guardar rol' }));

    // Assert
    expect(equiposService.updateRol).toHaveBeenCalledWith(9, 'Tester / QA', '#b45309');
    expect(onGuardado).toHaveBeenCalled();
  });
});
