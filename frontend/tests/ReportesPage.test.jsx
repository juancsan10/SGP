// HU-35 — Página de Reportes y botones de exportación en el detalle del proyecto
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import ReportesPage, { escaparHtml } from '../src/pages/ReportesPage.jsx';
import ProyectoDetallePage from '../src/pages/ProyectoDetallePage.jsx';
import * as api from '../src/services/api.js';
import { renderConSesion } from './render-con-sesion.jsx';

// Stub de todo el cliente HTTP; cada test cambia solo lo que necesita
vi.mock('../src/services/api.js', async (importOriginal) => {
  const real = await importOriginal();
  const stubs = {};
  for (const [nombre, servicio] of Object.entries(real)) {
    if (nombre === 'default') continue;
    stubs[nombre] = Object.fromEntries(Object.keys(servicio).map((f) => [f, vi.fn()]));
  }
  return stubs;
});

const vacio = () => Promise.resolve({ data: { data: [] } });
const INSTRUCTOR = { id: 2, nombres: 'Laura', apellidos: 'Gómez', rol: 'Instructor' };
const APRENDIZ = { id: 4, nombres: 'Carlos', apellidos: 'Herrera', rol: 'Aprendiz' };
const PROYECTOS = [
  { id_proyecto: 1, nombre: 'Sistema Web SENA', instructor: 'Laura Gómez', estado: 'Activo', porcentaje_avance: '65.00', fecha_inicio: '2026-07-06T00:00:00Z', fecha_fin: '2026-12-03T00:00:00Z', descripcion: 'Gestión académica' },
  { id_proyecto: 2, nombre: 'App Inventario', instructor: 'Miguel Torres', estado: 'Finalizado', porcentaje_avance: '100.00' },
  ...Array.from({ length: 8 }, (_, i) => ({ id_proyecto: 10 + i, nombre: `Proyecto ${i}`, instructor: 'Laura Gómez', estado: 'En Desarrollo', porcentaje_avance: '10' })),
];
const RESUMEN = { totalProyectos: 10, activos: 9, enPlanificacion: 0, finalizados: 1, suspendidos: 0, promedioAvance: '25.5' };

let ventana;
beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
  URL.createObjectURL = vi.fn(() => 'blob:fake');
});

beforeEach(() => {
  vi.clearAllMocks();
  for (const servicio of Object.values(api)) {
    for (const funcion of Object.values(servicio)) funcion.mockImplementation(vacio);
  }
  api.proyectosService.getAll.mockResolvedValue({ data: { data: PROYECTOS } });
  api.proyectosService.getById.mockResolvedValue({ data: { data: PROYECTOS[0] } });
  api.reportesService.getResumen.mockResolvedValue({ data: { data: { resumen: RESUMEN } } });
  ventana = { document: { write: vi.fn(), close: vi.fn() }, focus: vi.fn(), print: vi.fn() };
  vi.spyOn(window, 'open').mockReturnValue(ventana);
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {}); // jsdom no navega a blob:
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ReportesPage', () => {
  it('should show the summary KPIs from the backend', async () => {
    renderConSesion(<ReportesPage />, { usuario: INSTRUCTOR });

    expect(await screen.findByText('Reportes Individuales de Proyecto')).toBeInTheDocument();
    expect(screen.getByText('25.5%')).toBeInTheDocument();
    expect(screen.getByText('Sistema Web SENA')).toBeInTheDocument();
  });

  it('should compute the KPIs locally when the summary fails', async () => {
    api.reportesService.getResumen.mockRejectedValue(new Error('500'));

    renderConSesion(<ReportesPage />, { usuario: INSTRUCTOR });

    expect(await screen.findByText('Reportes Individuales de Proyecto')).toBeInTheDocument();
    expect(screen.getByText('App Inventario')).toBeInTheDocument();
  });

  it('should filter projects by text and by state', async () => {
    const user = userEvent.setup();
    renderConSesion(<ReportesPage />, { usuario: INSTRUCTOR });
    await screen.findByText('Sistema Web SENA');

    await user.type(screen.getByPlaceholderText('Buscar por nombre o instructor…'), 'miguel');
    expect(screen.getByText('App Inventario')).toBeInTheDocument();
    expect(screen.queryByText('Sistema Web SENA')).not.toBeInTheDocument();

    await user.clear(screen.getByPlaceholderText('Buscar por nombre o instructor…'));
    await user.selectOptions(screen.getByDisplayValue('Todos los estados'), 'Cancelado');
    expect(screen.getByText('No se encontraron proyectos con el criterio seleccionado.')).toBeInTheDocument();
  });

  it('should download the consolidated PDF and Excel from the backend', async () => {
    const user = userEvent.setup();
    renderConSesion(<ReportesPage />, { usuario: INSTRUCTOR });
    await screen.findByText('Sistema Web SENA');

    await user.click(screen.getByTitle('Exporta todos los proyectos en un documento PDF institucional'));
    expect(api.reportesService.descargarConsolidadoPdf).toHaveBeenCalled();
    expect(await screen.findByText('✅ Reporte consolidado en PDF descargado exitosamente.')).toBeInTheDocument();

    await user.click(screen.getByTitle('Exporta todos los proyectos en un libro Excel estructurado'));
    expect(api.reportesService.descargarConsolidadoExcel).toHaveBeenCalled();
    expect(await screen.findByText('✅ Reporte consolidado en Excel (.xlsx) descargado exitosamente.')).toBeInTheDocument();
  });

  it('should download one project in PDF and Excel', async () => {
    const user = userEvent.setup();
    renderConSesion(<ReportesPage />, { usuario: INSTRUCTOR });
    await screen.findByText('Sistema Web SENA');

    await user.click(screen.getAllByTitle('Descargar reporte completo en PDF')[0]);
    expect(api.reportesService.descargarProyectoPdf).toHaveBeenCalledWith(1, 'Sistema Web SENA');

    await user.click(screen.getAllByTitle('Descargar reporte detallado en Excel (.xlsx)')[0]);
    expect(api.reportesService.descargarProyectoExcel).toHaveBeenCalledWith(1, 'Sistema Web SENA');
  });

  it('should use the client fallbacks when the backend fails', async () => {
    const user = userEvent.setup();
    for (const f of ['descargarConsolidadoPdf', 'descargarConsolidadoExcel', 'descargarProyectoPdf', 'descargarProyectoExcel']) {
      api.reportesService[f].mockRejectedValue(new Error('500'));
    }
    renderConSesion(<ReportesPage />, { usuario: INSTRUCTOR });
    await screen.findByText('Sistema Web SENA');

    await user.click(screen.getByTitle('Exporta todos los proyectos en un documento PDF institucional'));
    await user.click(screen.getByTitle('Exporta todos los proyectos en un libro Excel estructurado'));
    await user.click(screen.getAllByTitle('Descargar reporte completo en PDF')[0]);
    await user.click(screen.getAllByTitle('Descargar reporte detallado en Excel (.xlsx)')[0]);

    expect(window.open).toHaveBeenCalledTimes(2);
    expect(URL.createObjectURL).toHaveBeenCalledTimes(2);
  });

  it('should escape user text written into the print window (XSS)', async () => {
    const user = userEvent.setup();
    api.proyectosService.getAll.mockResolvedValue({ data: { data: [
      { id_proyecto: 7, nombre: '<img src=x onerror=alert(1)>', instructor: 'Laura', estado: 'Activo', descripcion: '<script>robar()</script>' },
    ] } });
    api.reportesService.descargarProyectoPdf.mockRejectedValue(new Error('500'));
    renderConSesion(<ReportesPage />, { usuario: INSTRUCTOR });
    await screen.findByText('<img src=x onerror=alert(1)>');

    await user.click(screen.getByTitle('Descargar reporte completo en PDF'));

    const html = ventana.document.write.mock.calls[0][0];
    expect(html).not.toContain('<img src=x');
    expect(html).not.toContain('<script>robar');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });

  it('escaparHtml should neutralize HTML characters and empty values', () => {
    expect(escaparHtml(`<a href="x">'&'</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;');
    expect(escaparHtml(null)).toBe('');
  });
});

describe('ProyectoDetallePage — exportar (HU-35)', () => {
  const abrir = (usuario) => renderConSesion(
    <Routes><Route path="/proyectos/:id" element={<ProyectoDetallePage />} /></Routes>,
    { usuario, ruta: '/proyectos/1' },
  );

  it('should not show the export buttons to the Aprendiz', async () => {
    abrir(APRENDIZ);
    await screen.findByRole('heading', { name: 'Sistema Web SENA' });
    expect(screen.queryByText('Exportar PDF')).not.toBeInTheDocument();
  });

  it('should export the project from its detail page', async () => {
    const user = userEvent.setup();
    abrir(INSTRUCTOR);
    await screen.findByRole('heading', { name: 'Sistema Web SENA' });

    await user.click(screen.getByText('Exportar PDF'));
    expect(api.reportesService.descargarProyectoPdf).toHaveBeenCalledWith('1', 'Sistema Web SENA');
    expect(await screen.findByText('✅ Reporte PDF descargado con éxito.')).toBeInTheDocument();

    await user.click(screen.getByText('Exportar Excel'));
    expect(await screen.findByText('✅ Reporte Excel (.xlsx) descargado con éxito.')).toBeInTheDocument();
  });

  it('should fall back to print and CSV when the backend fails', async () => {
    const user = userEvent.setup();
    window.print = vi.fn();
    api.reportesService.descargarProyectoPdf.mockRejectedValue(new Error('500'));
    api.reportesService.descargarProyectoExcel.mockRejectedValue(new Error('500'));
    abrir(INSTRUCTOR);
    await screen.findByRole('heading', { name: 'Sistema Web SENA' });

    await user.click(screen.getByText('Exportar PDF'));
    await user.click(screen.getByText('Exportar Excel'));

    expect(window.print).toHaveBeenCalled();
    expect(URL.createObjectURL).toHaveBeenCalled();
  });
});
