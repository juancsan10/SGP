import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CalificacionChip, DetalleEntregaModal } from '../src/components/CalificacionEntrega.jsx';
import { entregasService } from '../src/services/api.js';

vi.mock('../src/services/api.js', () => ({
  entregasService: { getDetalle: vi.fn() },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('CalificacionChip', () => {
  it.each([
    [80, '80 / 100', 'badge-green'],     // borde inferior del verde
    [79.5, '79.5 / 100', 'badge-amber'], // justo por debajo, con un decimal
    [60, '60 / 100', 'badge-amber'],     // borde inferior del ámbar
    [59, '59 / 100', 'badge-red'],
    ['100', '100 / 100', 'badge-green'], // MySQL puede enviar DECIMAL como texto
  ])('should paint a grade of %s as %s with %s', (valor, texto, clase) => {
    render(<CalificacionChip valor={valor} />);

    expect(screen.getByText(texto)).toHaveClass(clase);
  });

  it.each([null, undefined, ''])('should say "Sin calificar" when the grade is %o', (valor) => {
    render(<CalificacionChip valor={valor} />);

    expect(screen.getByText('Sin calificar')).toBeInTheDocument();
  });

  it('should show a grade of 0 instead of "Sin calificar"', () => {
    // 0 es una calificación válida, no "vacío"
    render(<CalificacionChip valor={0} />);

    expect(screen.getByText('0 / 100')).toHaveClass('badge-red');
  });
});

describe('DetalleEntregaModal', () => {
  it('should show the delivery as read only, without buttons to grade', async () => {
    // Arrange
    entregasService.getDetalle.mockResolvedValueOnce({ data: { data: {
      titulo_tarea: 'Diseñar login', nombre_proyecto: 'SGP', estado: 'Aprobada', calificacion: 92,
      aprendiz_nombre: 'Carlos Herrera', instructor_nombre: 'Laura Gómez', url_entrega: 'https://github.com/sgp',
      observacion_instructor: 'Buen trabajo',
    } } });

    // Act
    render(<DetalleEntregaModal idEntrega={30} onClose={vi.fn()} />);

    // Assert
    expect(await screen.findByText('Buen trabajo')).toBeInTheDocument();
    expect(screen.getAllByText('92 / 100')).toHaveLength(2);
    expect(screen.getByRole('link', { name: /Abrir enlace de la entrega/ })).toHaveAttribute('href', 'https://github.com/sgp');
    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual(['×', 'Cerrar']);
  });

  it('should show the backend message when the delivery cannot be loaded', async () => {
    entregasService.getDetalle.mockRejectedValueOnce({ response: { data: { message: 'Entrega no encontrada' } } });

    render(<DetalleEntregaModal idEntrega={999} onClose={vi.fn()} />);

    expect(await screen.findByText('Entrega no encontrada')).toBeInTheDocument();
  });

  it('should close when "Cerrar" is clicked', async () => {
    entregasService.getDetalle.mockResolvedValueOnce({ data: { data: { titulo_tarea: 'Login' } } });
    const onClose = vi.fn();
    render(<DetalleEntregaModal idEntrega={30} onClose={onClose} />);

    await userEvent.click(screen.getByRole('button', { name: 'Cerrar' }));

    expect(onClose).toHaveBeenCalledOnce();
  });
});
