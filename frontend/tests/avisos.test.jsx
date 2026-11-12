import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmModal, ModalHeader, useModalAccesible } from '../src/components/helpers.jsx';

// Aviso mínimo que usa el hook, como lo hacen los formularios reales.
function AvisoDePrueba({ abierto, onClose }) {
  const ref = useModalAccesible(abierto, onClose);
  if (!abierto) return null;
  return (
    <div ref={ref} role="dialog" aria-labelledby="t">
      <ModalHeader id="t" icono="🧭" titulo="Nueva fase" descripcion="Ordena el proyecto por etapas." onClose={onClose} />
      <input aria-label="Nombre" />
      <button type="button">Crear</button>
    </div>
  );
}

describe('Avisos accesibles (ModalHeader + useModalAccesible)', () => {
  it('should show the title, the description and an accessible close button', () => {
    // Arrange / Act
    render(<AvisoDePrueba abierto onClose={vi.fn()} />);

    // Assert
    expect(screen.getByRole('dialog', { name: 'Nueva fase' })).toBeInTheDocument();
    expect(screen.getByText('Ordena el proyecto por etapas.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cerrar aviso' })).toBeInTheDocument();
  });

  it('should focus the first form field when the notice opens', () => {
    // Arrange / Act
    render(<AvisoDePrueba abierto onClose={vi.fn()} />);

    // Assert
    expect(screen.getByLabelText('Nombre')).toHaveFocus();
  });

  it('should call onClose when the user presses Escape', async () => {
    // Arrange
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<AvisoDePrueba abierto onClose={onClose} />);

    // Act
    await user.keyboard('{Escape}');

    // Assert
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should keep the focus inside the notice when tabbing past the last button', async () => {
    // Arrange
    const user = userEvent.setup();
    render(<AvisoDePrueba abierto onClose={vi.fn()} />);
    screen.getByRole('button', { name: 'Crear' }).focus();

    // Act
    await user.tab();

    // Assert: vuelve al primer elemento enfocable (el botón de cerrar)
    expect(screen.getByRole('button', { name: 'Cerrar aviso' })).toHaveFocus();
  });
});

describe('ConfirmModal con teclado', () => {
  it('should expose an alertdialog named by its title and cancel with Escape', async () => {
    // Arrange
    const user = userEvent.setup();
    const onCancelar = vi.fn();
    render(<ConfirmModal abierto titulo="¿Desactivar este usuario?" mensaje="Podrás reactivarlo." onConfirmar={vi.fn()} onCancelar={onCancelar} />);

    // Act
    await user.keyboard('{Escape}');

    // Assert
    expect(screen.getByRole('alertdialog', { name: '¿Desactivar este usuario?' })).toBeInTheDocument();
    expect(onCancelar).toHaveBeenCalledTimes(1);
  });

  it('should not cancel with Escape while the action is processing', async () => {
    // Arrange
    const user = userEvent.setup();
    const onCancelar = vi.fn();
    render(<ConfirmModal abierto cargando titulo="¿Eliminar?" mensaje="…" onConfirmar={vi.fn()} onCancelar={onCancelar} />);

    // Act
    await user.keyboard('{Escape}');

    // Assert
    expect(onCancelar).not.toHaveBeenCalled();
  });
});
