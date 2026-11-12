import { createRequire } from 'node:module';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

// Punto 4 (#19): roles de equipo con etiqueta de color.

const require = createRequire(import.meta.url);
const db = require('../src/config/db');
const app = require('../src/app');
const { PALETA_ROLES, ROLES_PREDETERMINADOS } = require('../src/utils/roles-equipo');

const SECRETO = 'secreto_solo_para_tests_de_api_32chars';
const INSTRUCTOR = { id: 2, rol: 'Instructor' };
const APRENDIZ = { id: 4, rol: 'Aprendiz' };
const tokenDe = (u) => `Bearer ${jwt.sign(u, SECRETO, { expiresIn: '1h' })}`;

beforeAll(() => { process.env.JWT_SECRET = SECRETO; });
afterEach(() => { vi.restoreAllMocks(); });

// Luminancia relativa WCAG
function contrasteConBlanco(hex) {
  const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(x => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
  const l = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  return 1.05 / (l + 0.05);
}

describe('paleta de roles', () => {
  it('should keep white text readable (contrast >= 4.5) on every palette color', () => {
    for (const color of PALETA_ROLES) expect(contrasteConBlanco(color)).toBeGreaterThanOrEqual(4.5);
  });

  it('should only use palette colors for the default roles', () => {
    for (const rol of ROLES_PREDETERMINADOS) expect(PALETA_ROLES).toContain(rol.color);
  });
});

describe('/api/v1/roles-equipo', () => {
  it('should list the default roles plus the instructor own roles', async () => {
    // Arrange
    vi.spyOn(db, 'query').mockResolvedValueOnce([[{ id_rol_equipo: 7, nombre: 'Scrum master', color: '#7c3aed' }]]);

    // Act
    const res = await request(app).get('/api/v1/roles-equipo').set('Authorization', tokenDe(INSTRUCTOR));

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.data.find(r => r.nombre === 'Desarrollador')).toMatchObject({ propio: false, color: '#2563eb' });
    expect(res.body.data.at(-1)).toMatchObject({ nombre: 'Scrum master', propio: true });
    expect(res.body.meta.paleta).toEqual(PALETA_ROLES);
  });

  it('should create a custom role with a palette color', async () => {
    // Arrange
    const spy = vi.spyOn(db, 'query').mockResolvedValueOnce([[]]).mockResolvedValueOnce([{ insertId: 8 }]).mockResolvedValue([{}]);

    // Act
    const res = await request(app).post('/api/v1/roles-equipo').set('Authorization', tokenDe(INSTRUCTOR))
      .send({ nombre: '  Scrum   master ', color: '#7C3AED' });

    // Assert
    expect(res.status).toBe(201);
    expect(spy.mock.calls[1][1]).toEqual([2, 'Scrum master', '#7c3aed']);
  });

  it.each([
    ['a color outside the palette', { nombre: 'Scrum master', color: '#ffff00' }],
    ['a name that is a default role', { nombre: 'desarrollador', color: '#2563eb' }],
    ['a too short name', { nombre: 'x', color: '#2563eb' }],
  ])('should reject %s', async (_caso, cuerpo) => {
    // Arrange
    const spy = vi.spyOn(db, 'query');

    // Act
    const res = await request(app).post('/api/v1/roles-equipo').set('Authorization', tokenDe(INSTRUCTOR)).send(cuerpo);

    // Assert
    expect(res.status).toBe(400);
    expect(spy).not.toHaveBeenCalled();
  });

  it('should rename and recolor the members of his projects that had the role', async () => {
    // Arrange
    const spy = vi.spyOn(db, 'query')
      .mockResolvedValueOnce([[{ id_rol_equipo: 7, id_instructor: 2, nombre: 'Scrum master', color: '#7c3aed' }]])
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce([{ affectedRows: 3 }])
      .mockResolvedValue([{}]);

    // Act
    const res = await request(app).put('/api/v1/roles-equipo/7').set('Authorization', tokenDe(INSTRUCTOR))
      .send({ nombre: 'Facilitador', color: '#be185d' });

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.data.miembrosActualizados).toBe(3);
    expect(spy.mock.calls[3][0]).toContain('p.id_instructor = ?');
    expect(spy.mock.calls[3][1]).toEqual(['Facilitador', '#be185d', 2, 'Scrum master']);
  });

  it('should not let an apprentice manage roles', async () => {
    const res = await request(app).post('/api/v1/roles-equipo').set('Authorization', tokenDe(APRENDIZ)).send({ nombre: 'Jefe', color: '#2563eb' });
    expect(res.status).toBe(403);
  });
});

describe('PUT /api/v1/equipos/:id/rol', () => {
  it('should save the member role and its color when the instructor owns the project', async () => {
    // Arrange
    const spy = vi.spyOn(db, 'query')
      .mockResolvedValueOnce([[{ id_proyecto: 3 }]])   // resolveProjectId('team')
      .mockResolvedValueOnce([[{ id_proyecto: 3 }]])   // es el instructor responsable
      .mockResolvedValueOnce([{ affectedRows: 1 }])    // UPDATE
      .mockResolvedValue([{}]);

    // Act
    const res = await request(app).put('/api/v1/equipos/9/rol').set('Authorization', tokenDe(INSTRUCTOR))
      .send({ rol_en_equipo: 'Tester / QA', color_rol: '#b45309' });

    // Assert
    expect(res.status).toBe(200);
    expect(spy.mock.calls[2][1]).toEqual(['Tester / QA', '#b45309', '9']);
  });

  it('should reject a color outside the palette', async () => {
    // Arrange
    vi.spyOn(db, 'query').mockResolvedValueOnce([[{ id_proyecto: 3 }]]).mockResolvedValueOnce([[{ id_proyecto: 3 }]]);

    // Act
    const res = await request(app).put('/api/v1/equipos/9/rol').set('Authorization', tokenDe(INSTRUCTOR))
      .send({ rol_en_equipo: 'Tester / QA', color_rol: 'red' });

    // Assert
    expect(res.status).toBe(400);
  });
});
