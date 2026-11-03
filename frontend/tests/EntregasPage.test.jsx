import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EntregasPage from '../src/pages/EntregasPage.jsx';
import { renderConSesion } from './render-con-sesion.jsx';
import { proyectosService, tareasService, entregasService } from '../src/services/api.js';

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

const APRENDIZ = { id: 4, nombres: 'Carlos', apellidos: 'Herrera', rol: 'Aprendiz' };
const INSTRUCTOR = { id: 2, nombres: 'Laura', apellidos: 'Gómez', rol: 'Instructor' };

const PROYECTO = { id_proyecto: 1, nombre: 'Proyecto SGP' };
const TAREA_ASIGNADA = {
  id_tarea: 10,
  titulo: 'Crear casos de prueba',
  estado: 'Pendiente',
  id_asignado: 4,
  asignado_nombre: 'Carlos Herrera',
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(proyectosService.getAll).mockResolvedValue({
    data: { data: [PROYECTO] },
  });
  vi.mocked(tareasService.getByProyecto).mockResolvedValue({
    data: { data: [TAREA_ASIGNADA] },
  });
});

describe('EntregasPage', () => {
  it('el aprendiz ve el botón de "📤 Entregar / corregir" para sus tareas asignadas (defecto id vs id_usuario)', async () => {
    // El login guarda { id: 4, ... }. Si EntregasPage busca usuario.id_usuario, no encuentra la tarea.
    renderConSesion(<EntregasPage />, { usuario: APRENDIZ, ruta: '/entregas' });

    expect(await screen.findByRole('heading', { name: 'Entregas' })).toBeInTheDocument();
    expect(screen.getByText('Crear casos de prueba')).toBeInTheDocument();

    const btnEntregar = screen.getByRole('button', { name: /Entregar \/ corregir/i });
    expect(btnEntregar).toBeInTheDocument();
  });

  it('el instructor ve "🔎 Revisar" y el aprendiz no', async () => {
    const { unmount } = renderConSesion(<EntregasPage />, { usuario: INSTRUCTOR, ruta: '/entregas' });

    expect(await screen.findByRole('button', { name: /Revisar/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Entregar \/ corregir/i })).not.toBeInTheDocument();

    unmount();

    renderConSesion(<EntregasPage />, { usuario: APRENDIZ, ruta: '/entregas' });
    expect(await screen.findByRole('heading', { name: 'Entregas' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Revisar/i })).not.toBeInTheDocument();
  });

  it('enviar la entrega llama a entregasService.submit con id_tarea y el formulario', async () => {
    const user = userEvent.setup();
    vi.mocked(entregasService.getByTarea).mockResolvedValueOnce({
      data: { data: null },
    });
    vi.mocked(entregasService.submit).mockResolvedValueOnce({
      data: { success: true },
    });

    renderConSesion(<EntregasPage />, { usuario: APRENDIZ, ruta: '/entregas' });

    const btnEntregar = await screen.findByRole('button', { name: /Entregar \/ corregir/i });
    await user.click(btnEntregar);

    expect(screen.getByText('Entrega de tarea')).toBeInTheDocument();

    const comentarioInput = screen.getByLabelText(/Comentario/i);
    const enlaceInput = screen.getByLabelText(/Enlace/i);

    await user.type(comentarioInput, 'Entrega de casos de prueba terminada');
    await user.type(enlaceInput, 'https://github.com/sgp/entregas/1');

    await user.click(screen.getByRole('button', { name: 'Enviar entrega' }));

    await waitFor(() => {
      expect(entregasService.submit).toHaveBeenCalledWith(10, expect.objectContaining({
        comentario_aprendiz: 'Entrega de casos de prueba terminada',
        url_entrega: 'https://github.com/sgp/entregas/1',
      }));
    });
  });

  it('subir un archivo no permitido muestra error con role="alert"', async () => {
    const user = userEvent.setup();
    vi.mocked(entregasService.getByTarea).mockResolvedValueOnce({
      data: { data: null },
    });

    renderConSesion(<EntregasPage />, { usuario: APRENDIZ, ruta: '/entregas' });

    const btnEntregar = await screen.findByRole('button', { name: /Entregar \/ corregir/i });
    await user.click(btnEntregar);

    const archivoInvalido = new File(['contenido ejecutable'], 'virus.exe', { type: 'application/x-msdownload' });
    const inputArchivo = screen.getByLabelText(/Archivo/i, { selector: 'input' });

    await user.upload(inputArchivo, archivoInvalido);

    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent('Solo se permiten archivos PDF, JPG, PNG o WEBP');
  });
});
