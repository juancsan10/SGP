import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Pagination, ConfirmModal, EmptyState } from '../src/components/helpers.jsx';

describe('componentes helpers', () => {
  describe('Pagination', () => {
    it('no renderiza nada si totalPages es 1 o menos', () => {
      const { container } = render(<Pagination total={5} limit={10} offset={0} onChange={() => {}} />);
      expect(container.firstChild).toBeNull();
    });

    it('renderiza botones de paginación y permite navegar', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Pagination total={30} limit={10} offset={0} onChange={onChange} />);

      expect(screen.getByText('30 en total')).toBeInTheDocument();
      const btn2 = screen.getByRole('button', { name: '2' });
      await user.click(btn2);
      expect(onChange).toHaveBeenCalledWith(10);

      const btnSiguiente = screen.getByRole('button', { name: /Siguiente/ });
      await user.click(btnSiguiente);
      expect(onChange).toHaveBeenCalledWith(10);
    });

    it('deshabilita el botón Anterior en la primera página', () => {
      render(<Pagination total={25} limit={10} offset={0} onChange={() => {}} />);
      expect(screen.getByRole('button', { name: /Anterior/ })).toBeDisabled();
    });

    it('deshabilita el botón Siguiente en la última página', () => {
      render(<Pagination total={25} limit={10} offset={20} onChange={() => {}} />);
      expect(screen.getByRole('button', { name: /Siguiente/ })).toBeDisabled();
    });
  });

  describe('ConfirmModal', () => {
    it('no renderiza nada cuando está cerrado', () => {
      const { container } = render(<ConfirmModal abierto={false} />);
      expect(container.firstChild).toBeNull();
    });

    it('renderiza título, mensaje y dispara callbacks al confirmar o cancelar', async () => {
      const user = userEvent.setup();
      const onConfirmar = vi.fn();
      const onCancelar = vi.fn();

      render(
        <ConfirmModal
          abierto={true}
          titulo="¿Confirmar acción?"
          mensaje="Esta acción no se puede deshacer"
          textoConfirmar="Aceptar"
          textoCancelar="Volver"
          onConfirmar={onConfirmar}
          onCancelar={onCancelar}
        />
      );

      expect(screen.getByText('¿Confirmar acción?')).toBeInTheDocument();
      expect(screen.getByText('Esta acción no se puede deshacer')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Aceptar' }));
      expect(onConfirmar).toHaveBeenCalledTimes(1);

      await user.click(screen.getByRole('button', { name: 'Volver' }));
      expect(onCancelar).toHaveBeenCalledTimes(1);
    });
  });

  describe('EmptyState', () => {
    it('muestra el ícono, título y descripción', () => {
      render(
        <EmptyState
          icon="📦"
          titulo="Sin elementos"
          desc="No hay registros disponibles por ahora"
        />
      );
      expect(screen.getByText('Sin elementos')).toBeInTheDocument();
      expect(screen.getByText('No hay registros disponibles por ahora')).toBeInTheDocument();
      expect(screen.getByText('📦')).toBeInTheDocument();
    });
  });
});
