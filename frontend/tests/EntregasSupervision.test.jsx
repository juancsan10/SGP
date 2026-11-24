import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EntregasPage from '../src/pages/EntregasPage.jsx';
import { renderConSesion } from './render-con-sesion.jsx';
import { entregasService } from '../src/services/api.js';

// Semana 8 (capa Front): EntregasPage.jsx tenía 38 % de ramas. La vista del Administrador
// (EntregasSupervisionAdmin, líneas 24-136) no la recorría ningún test.
vi.mock('../src/services/api.js', async (importOriginal) => {
  const real = await importOriginal();
  const vacio = () => Promise.resolve({ data: { data: [], meta: { total: 0, limit: 10, offset: 0 } } });
  const stubs = {};
  for (const [nombre, servicio] of Object.entries(real)) {
    if (nombre === 'default') continue;
    stubs[nombre] = Object.fromEntries(Object.keys(servicio).map((funcion) => [funcion, vi.fn(vacio)]));
  }
  return stubs;
});

const ADMIN = { id: 1, nombres: 'Diana', apellidos: 'Ríos', rol: 'Administrador' };
const ENTREGAS = [
  { id_entrega: 30, titulo_tarea: 'Diagrama de clases', nombre_proyecto: 'SGP', estado: 'Aprobada', calificacion: '92.00',
    aprendiz_nombre: 'Ana Ruiz', cc_aprendiz: '1012345678', instructor_nombre: 'Laura Gómez', cc_instructor: null, fecha_entrega: '2026-03-01' },
  { id_entrega: 31, titulo_tarea: 'Casos de uso', nombre_proyecto: 'SGP', estado: 'Requiere corrección', calificacion: null,
    aprendiz_nombre: 'Luis Peña', cc_aprendiz: null, instructor_nombre: 'Laura Gómez', cc_instructor: '79000000', fecha_entrega: '2026-03-02' },
];
const conEntregas = (data = ENTREGAS, total = data.length, offset = 0) =>
  Promise.resolve({ data: { data, meta: { total, limit: 10, offset } } });

beforeEach(() => {
  vi.clearAllMocks();
});

describe('EntregasPage (supervisión del Administrador)', () => {
  it('should list every delivery with its state, grade and the people involved', async () => {
    entregasService.getAllAdmin.mockImplementation(() => conEntregas());

    renderConSesion(<EntregasPage />, { usuario: ADMIN });

    const fila = await screen.findByRole('row', { name: /Diagrama de clases/ });
    expect(screen.getByText('Supervisión de todos los proyectos · 2 entrega(s)')).toBeInTheDocument();
    expect(within(fila).getByText('1012345678')).toBeInTheDocument();
    expect(within(screen.getByRole('row', { name: /Casos de uso/ })).getByText('79000000')).toBeInTheDocument();
  });

  it('should filter by state, cc and project and clear the filters', async () => {
    entregasService.getAllAdmin.mockImplementation(() => conEntregas());
    const user = userEvent.setup();
    renderConSesion(<EntregasPage />, { usuario: ADMIN });
    await screen.findByRole('row', { name: /Diagrama de clases/ });

    await user.selectOptions(screen.getByDisplayValue('Todos los estados'), 'Requiere corrección');
    await user.type(screen.getByPlaceholderText(/cc aprendiz o instructor/), '1012$');
    await user.type(screen.getByPlaceholderText('Nombre del proyecto…'), 'SGP');

    await waitFor(() => expect(entregasService.getAllAdmin).toHaveBeenLastCalledWith(
      expect.objectContaining({ estado: 'Requiere corrección', cc: '1012', proyecto: 'SGP', offset: 0 }),
    ));
    await user.click(screen.getByRole('button', { name: 'Limpiar filtros ×' }));
    expect(screen.getByPlaceholderText('Nombre del proyecto…')).toHaveValue('');
  });

  it('should show an empty state when no delivery matches', async () => {
    entregasService.getAllAdmin.mockImplementation(() => conEntregas([]));

    renderConSesion(<EntregasPage />, { usuario: ADMIN });

    expect(await screen.findByText('Sin entregas')).toBeInTheDocument();
  });

  it.each([
    ['the message of the API', { response: { data: { message: 'Token inválido o expirado' } } }, 'Token inválido o expirado'],
    ['a generic message without answer', new Error('Network Error'), 'No se pudieron cargar las entregas'],
  ])('should show %s when loading fails', async (_caso, error, mensaje) => {
    entregasService.getAllAdmin.mockRejectedValue(error);

    renderConSesion(<EntregasPage />, { usuario: ADMIN });

    expect(await screen.findByRole('alert')).toHaveTextContent(mensaje);
  });

  it('should open the review of a delivery', async () => {
    entregasService.getAllAdmin.mockImplementation(() => conEntregas());
    entregasService.getDetalle.mockResolvedValue({ data: { data: { id_entrega: 30, calificacion: '92.00', estado: 'Aprobada' } } });
    const user = userEvent.setup();
    renderConSesion(<EntregasPage />, { usuario: ADMIN });

    await user.click(within(await screen.findByRole('row', { name: /Diagrama de clases/ })).getByRole('button', { name: '👁️ Revisar' }));

    expect(entregasService.getDetalle).toHaveBeenCalledWith(30);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('should ask the API for the next page', async () => {
    entregasService.getAllAdmin.mockImplementation((params) => conEntregas(ENTREGAS, 25, params.offset));
    const user = userEvent.setup();
    renderConSesion(<EntregasPage />, { usuario: ADMIN });
    await screen.findByRole('row', { name: /Diagrama de clases/ });

    await user.click(screen.getByRole('button', { name: /siguiente/i }));

    await waitFor(() => expect(entregasService.getAllAdmin).toHaveBeenLastCalledWith(expect.objectContaining({ offset: 10 })));
  });
});
