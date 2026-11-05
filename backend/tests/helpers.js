import { vi } from 'vitest';

// Respuesta falsa de Express: guarda el código y el JSON que envía el código probado
export function crearRes() {
  const res = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  return res;
}

// Petición falsa con lo mínimo que usan los middlewares y controladores
export function crearReq({ user, params = {}, body = {}, headers = {}, query = {} } = {}) {
  return { user, params, body, headers, query };
}
