// =====================================================
// utils/calendario.js  (NUEVO)
// Lógica pura del calendario: claves de día, cuadrícula del mes,
// semana y agrupación de actividades. Semana de lunes a domingo.
// =====================================================

export const TIPOS_EVENTO = {
  tarea:      { etiqueta: 'Tarea',      icono: '✅' },
  entregable: { etiqueta: 'Entregable', icono: '📦' },
  reunion:    { etiqueta: 'Reunión',    icono: '📅' },
};

export const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const dosDigitos = (n) => String(n).padStart(2, '0');

// Fecha local -> 'AAAA-MM-DD'
export function claveDeFecha(fecha) {
  return `${fecha.getFullYear()}-${dosDigitos(fecha.getMonth() + 1)}-${dosDigitos(fecha.getDate())}`;
}

// Valor que llega de la API -> 'AAAA-MM-DD' (o null).
// Las columnas DATE pueden llegar como 'AAAA-MM-DD' o como medianoche UTC
// ('…T00:00:00.000Z'); en ese caso se toma la fecha tal cual para que no
// "retroceda" un día por la zona horaria de Colombia.
export function claveDia(valor) {
  if (!valor) return null;
  const texto = String(valor);
  if (/^\d{4}-\d{2}-\d{2}$/.test(texto) || /^\d{4}-\d{2}-\d{2}T00:00:00(\.0+)?Z$/.test(texto)) return texto.slice(0, 10);
  const fecha = new Date(texto);
  return Number.isNaN(fecha.getTime()) ? null : claveDeFecha(fecha);
}

// Hora local 'HH:MM' solo cuando el valor trae una hora real (reuniones).
export function horaEvento(valor) {
  if (!valor) return '';
  const texto = String(valor);
  if (!texto.includes('T') || /T00:00:00(\.0+)?Z$/.test(texto)) return '';
  const fecha = new Date(texto);
  if (Number.isNaN(fecha.getTime())) return '';
  return `${dosDigitos(fecha.getHours())}:${dosDigitos(fecha.getMinutes())}`;
}

// Día que representa a la actividad en el calendario: su fecha límite
// (tareas) o su única fecha (entregables y reuniones).
export function diaDeEvento(evento) {
  return claveDia(evento.end) || claveDia(evento.start);
}

// Lunes de la semana que contiene la fecha.
export function inicioSemana(fecha) {
  const d = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
  const desdeLunes = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - desdeLunes);
  return d;
}

// Los 7 días (Date) de la semana que contiene la fecha.
export function diasDeSemana(fecha) {
  const lunes = inicioSemana(fecha);
  return Array.from({ length: 7 }, (_, i) => new Date(lunes.getFullYear(), lunes.getMonth(), lunes.getDate() + i));
}

// Cuadrícula tipo almanaque: 6 semanas (42 días) que cubren el mes,
// empezando en el lunes anterior al día 1.
export function cuadriculaMes(anio, mes) {
  const lunes = inicioSemana(new Date(anio, mes, 1));
  return Array.from({ length: 42 }, (_, i) => {
    const fecha = new Date(lunes.getFullYear(), lunes.getMonth(), lunes.getDate() + i);
    return { fecha, clave: claveDeFecha(fecha), delMes: fecha.getMonth() === mes };
  });
}

// { 'AAAA-MM-DD': [eventos ordenados] }
export function agruparPorDia(eventos) {
  const grupos = {};
  for (const evento of eventos) {
    const clave = diaDeEvento(evento);
    if (!clave) continue;
    (grupos[clave] ||= []).push(evento);
  }
  for (const lista of Object.values(grupos)) lista.sort(compararEventos);
  return grupos;
}

// Orden: por fecha/hora y, a igual fecha, por título.
export function compararEventos(a, b) {
  const fa = String(a.end || a.start || '');
  const fb = String(b.end || b.start || '');
  return fa.localeCompare(fb) || String(a.title).localeCompare(String(b.title), 'es');
}

export function etiquetaMes(anio, mes) {
  const texto = new Date(anio, mes, 1).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export function etiquetaDia(fecha, opciones = { weekday: 'long', day: 'numeric', month: 'long' }) {
  const texto = fecha.toLocaleDateString('es-CO', opciones);
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

// 'AAAA-MM-DD' -> Date local
export function fechaDeClave(clave) {
  const [a, m, d] = clave.split('-').map(Number);
  return new Date(a, m - 1, d);
}
