import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test as base, expect } from '@playwright/test';
import { BACKEND_URL } from '../../playwright.config.js';

// Fixtures compartidas por los E2E de la semana 7.
// - "api": crea por el API los datos que necesita cada test, con valores únicos.
// - "entrarComo(page, cuenta)": deja la sesión lista en el navegador sin pasar por la UI de login.
const carpeta = path.dirname(fileURLToPath(import.meta.url));

// La sesión del administrador la deja global-setup.js. Se lee al usarla (no al importar):
// Playwright carga los archivos de test antes de correr el global setup.
function tokenAdmin() {
  const sesion = JSON.parse(fs.readFileSync(path.join(carpeta, '..', '..', '.auth', 'admin.json'), 'utf8'));
  return sesion.origins[0].localStorage.find((x) => x.name === 'sgp_token').value;
}

export const CONTRASENA = 'Sena2026*';
let secuencia = 0;
export const unico = (prefijo) => `${prefijo} ${Date.now().toString(36)}${process.pid % 1000}${(secuencia += 1)}`;
const correoUnico = (rol) => `${rol}.${Date.now().toString(36)}.${process.pid}.${(secuencia += 1)}@e2e.sgpsena.local`;

// Fecha YYYY-MM-DD a "dias" de hoy (las reglas de tareas y entregables miran el día actual)
export const enDias = (dias) => {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + dias);
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
};

async function cuerpo(respuesta, accion) {
  const datos = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok()) throw new Error(`${accion} respondió ${respuesta.status()}: ${datos.message}`);
  return datos;
}

function crearApi(request) {
  const conToken = (token) => ({ Authorization: `Bearer ${token}` });

  const api = {
    async login(correo, contrasena = CONTRASENA) {
      const { data } = await cuerpo(await request.post('/api/v1/auth/login', { data: { correo, contrasena } }), 'login');
      return { ...data.usuario, token: data.token };
    },
    async crearInstructor() {
      const correo = correoUnico('instructor');
      await cuerpo(await request.post('/api/v1/auth/users', {
        headers: conToken(tokenAdmin()),
        data: { nombres: 'Instructor', apellidos: unico('E2E'), correo, contrasena: CONTRASENA, id_rol: 2 },
      }), 'crear instructor');
      return api.login(correo);
    },
    async crearAprendiz() {
      const correo = correoUnico('aprendiz');
      await cuerpo(await request.post('/api/v1/auth/register', {
        data: { nombres: 'Aprendiz', apellidos: unico('E2E'), correo, contrasena: CONTRASENA, ficha: '3228970', programa_formacion: 'ADSO' },
      }), 'registrar aprendiz');
      return api.login(correo);
    },
    async crearProyecto(instructor, datos = {}) {
      const { data } = await cuerpo(await request.post('/api/v1/proyectos', {
        headers: conToken(instructor.token),
        data: { nombre: unico('Proyecto'), fecha_inicio: enDias(-10), fecha_fin: enDias(60), id_instructor: instructor.id, ...datos },
      }), 'crear proyecto');
      return { id_proyecto: data.id_proyecto, ...datos };
    },
    async activarProyecto(instructor, idProyecto) {
      await cuerpo(await request.put(`/api/v1/proyectos/${idProyecto}`, { headers: conToken(instructor.token), data: { estado: 'Activo' } }), 'activar proyecto');
    },
    async agregarAlEquipo(instructor, idProyecto, aprendiz) {
      await cuerpo(await request.post('/api/v1/equipos', {
        headers: conToken(instructor.token), data: { id_proyecto: idProyecto, id_usuario: aprendiz.id, rol_en_equipo: 'Desarrollador' },
      }), 'agregar al equipo');
    },
    async crearTarea(instructor, idProyecto, aprendiz, datos = {}) {
      const { data } = await cuerpo(await request.post('/api/v1/tareas', {
        headers: conToken(instructor.token),
        data: { titulo: unico('Tarea'), id_proyecto: idProyecto, id_asignado: aprendiz.id, fecha_inicio: enDias(-1), fecha_vencimiento: enDias(10), prioridad: 'Media', ...datos },
      }), 'crear tarea');
      return { id_tarea: data.id_tarea, ...datos };
    },
    async proyectosDe(usuario) {
      const { data } = await cuerpo(await request.get('/api/v1/proyectos', { headers: conToken(usuario.token) }), 'listar proyectos');
      return data;
    },
    async entregaDe(usuario, idTarea) {
      const { data } = await cuerpo(await request.get(`/api/v1/entregas/tarea/${idTarea}`, { headers: conToken(usuario.token) }), 'ver entrega');
      return data;
    },
    async equipoDe(usuario, idProyecto) {
      const { data } = await cuerpo(await request.get(`/api/v1/equipos/${idProyecto}`, { headers: conToken(usuario.token) }), 'listar equipo');
      return data;
    },
  };
  return api;
}

export const test = base.extend({
  api: async ({ playwright }, use) => {
    const request = await playwright.request.newContext({ baseURL: BACKEND_URL });
    await use(crearApi(request));
    await request.dispose();
  },
  // Sesión sin UI: el token y el usuario quedan en localStorage antes de cargar la app
  entrarComo: async ({}, use) => {
    await use(async (page, cuenta) => {
      const { token, ...usuario } = cuenta;
      await page.addInitScript(([t, u]) => {
        localStorage.setItem('sgp_token', t);
        localStorage.setItem('sgp_usuario', u);
      }, [token, JSON.stringify(usuario)]);
    });
  },
});

export { expect };
