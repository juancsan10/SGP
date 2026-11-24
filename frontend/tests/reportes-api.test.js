// HU-35 — Cliente HTTP de reportes (descarga de archivos con token)
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { reportesService } from '../src/services/api.js';

const server = setupServer();
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
  URL.createObjectURL = vi.fn(() => 'blob:fake');
  URL.revokeObjectURL = vi.fn();
});
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

let descargados;
beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('sgp_token', 'abc.def.ghi');
  descargados = [];
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () { descargados.push(this.download); });
});

const archivo = (tipo) => () => new HttpResponse(new Uint8Array([1, 2, 3]), { headers: { 'Content-Type': tipo } });

describe('reportesService', () => {
  it('should read the summary', async () => {
    server.use(http.get('/api/v1/reportes/resumen', () => HttpResponse.json({ success: true, data: { resumen: { totalProyectos: 3 } } })));
    const res = await reportesService.getResumen();
    expect(res.data.data.resumen.totalProyectos).toBe(3);
  });

  it('should download the project files with a clean name and the token', async () => {
    let autorizacion;
    server.use(
      http.get('/api/v1/reportes/proyectos/5/pdf', ({ request }) => { autorizacion = request.headers.get('Authorization'); return archivo('application/pdf')(); }),
      http.get('/api/v1/reportes/proyectos/5/excel', archivo('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')),
    );

    await reportesService.descargarProyectoPdf(5, 'Mi proyecto/1');
    await reportesService.descargarProyectoExcel(5);

    expect(autorizacion).toBe('Bearer abc.def.ghi');
    expect(descargados).toEqual(['Reporte_Mi_proyecto_1_5.pdf', 'Reporte_proyecto_5.xlsx']);
  });

  it('should download the consolidated files', async () => {
    server.use(
      http.get('/api/v1/reportes/consolidado/pdf', archivo('application/pdf')),
      http.get('/api/v1/reportes/consolidado/excel', archivo('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')),
    );

    await reportesService.descargarConsolidadoPdf();
    await reportesService.descargarConsolidadoExcel();

    expect(descargados[0]).toMatch(/^Reporte_Consolidado_Proyectos_SENA_\d+\.pdf$/);
    expect(descargados[1]).toMatch(/\.xlsx$/);
  });

  it('should reject when the backend answers 403', async () => {
    server.use(http.get('/api/v1/reportes/consolidado/pdf', () => HttpResponse.json({ success: false }, { status: 403 })));
    await expect(reportesService.descargarConsolidadoPdf()).rejects.toMatchObject({ response: { status: 403 } });
  });
});
