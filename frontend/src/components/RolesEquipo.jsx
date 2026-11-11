// =====================================================
// components/RolesEquipo.jsx  (NUEVO — punto 4, #19)
// Roles de equipo como etiquetas de color.
// · EtiquetaRol: chip sólido con el nombre del rol.
// · SelectorRolEquipo: elige un rol (predeterminado o propio), crea uno
//   nuevo con su color y edita o elimina los propios.
// · CambiarRolModal: cambia el rol de un miembro ya agregado.
// =====================================================
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { equiposService, rolesEquipoService } from '../services/api.js';
import { portalDestino, ModalHeader, useModalAccesible } from './helpers.jsx';
import { PALETA_ROLES, colorDeRol } from '../utils/rolesEquipo.js';

export function EtiquetaRol({ nombre, color }) {
  if (!nombre) return <span style={{ color: 'var(--slate-500)' }}>—</span>;
  return (
    <span className="etiqueta-rol" style={{ '--rol-color': colorDeRol(nombre, color) }}>{nombre}</span>
  );
}

// Paleta como grupo de opciones accesible.
function SelectorColor({ valor, onChange, idGrupo }) {
  return (
    <div className="paleta-roles" role="radiogroup" aria-labelledby={idGrupo}>
      {PALETA_ROLES.map(p => (
        <button key={p.color} type="button" role="radio" aria-checked={valor === p.color} aria-label={p.nombre}
          title={p.nombre} className={`paleta-muestra ${valor === p.color ? 'activa' : ''}`}
          style={{ '--rol-color': p.color }} onClick={() => onChange(p.color)} />
      ))}
    </div>
  );
}

// Formulario corto para crear o editar un rol propio.
function FormRol({ inicial, onGuardar, onCancelar, guardando }) {
  const [nombre, setNombre] = useState(inicial?.nombre || '');
  const [color, setColor] = useState(inicial?.color || PALETA_ROLES[0].color);
  const id = inicial ? `editar-rol-${inicial.id_rol_equipo}` : 'nuevo-rol';
  return (
    <div className="form-rol">
      <div className="form-group" style={{ marginBottom: 8 }}>
        <label className="form-label" htmlFor={`${id}-nombre`}>{inicial ? 'Nombre del rol' : 'Nuevo rol'}</label>
        <input id={`${id}-nombre`} className="form-input" maxLength={60} placeholder="Ej. Scrum master"
          value={nombre} onChange={e => setNombre(e.target.value)}
          onKeyDown={e => {
            // Enter guarda el rol sin enviar el formulario del aviso que lo contiene.
            if (e.key === 'Enter') { e.preventDefault(); if (nombre.trim().length >= 2) onGuardar(nombre.trim(), color); }
          }} />
      </div>
      <span className="form-label" id={`${id}-color`}>Color</span>
      <SelectorColor valor={color} onChange={setColor} idGrupo={`${id}-color`} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, color: 'var(--slate-500)' }}>Vista previa:</span>
        <EtiquetaRol nombre={nombre.trim() || 'Rol'} color={color} />
        <span style={{ flex: 1 }} />
        <button type="button" className="btn btn-secondary btn-sm" onClick={onCancelar} disabled={guardando}>Cancelar</button>
        <button type="button" className="btn btn-primary btn-sm" disabled={guardando || nombre.trim().length < 2}
          onClick={() => onGuardar(nombre.trim(), color)}>
          {guardando ? 'Guardando…' : inicial ? 'Guardar rol' : 'Crear rol'}
        </button>
      </div>
    </div>
  );
}

export function SelectorRolEquipo({ valor, onChange, idEtiqueta }) {
  const [roles, setRoles] = useState([]);
  const [error, setError] = useState('');
  const [creando, setCreando] = useState(false);
  const [editando, setEditando] = useState(null);
  const [guardando, setGuardando] = useState(false);

  function cargar() {
    return rolesEquipoService.getAll()
      .then(r => { setRoles(r.data.data || []); setError(''); })
      .catch(err => setError(err.response?.data?.message || 'No se pudieron cargar los roles'));
  }
  useEffect(() => { cargar(); }, []);

  async function guardar(nombre, color) {
    setGuardando(true); setError('');
    try {
      if (editando) {
        await rolesEquipoService.update(editando.id_rol_equipo, nombre, color);
        if (valor?.nombre === editando.nombre) onChange({ nombre, color });
      } else {
        await rolesEquipoService.create(nombre, color);
        onChange({ nombre, color });
      }
      setCreando(false); setEditando(null);
      await cargar();
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo guardar el rol');
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar(rol) {
    setError('');
    try {
      await rolesEquipoService.remove(rol.id_rol_equipo);
      await cargar();
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo eliminar el rol');
    }
  }

  const propios = roles.filter(r => r.propio);
  return (
    <div>
      {error && <div className="alert alert-error" role="alert" style={{ marginBottom: 8 }}>{error}</div>}
      <div className="roles-opciones" role="radiogroup" aria-labelledby={idEtiqueta}>
        <button type="button" role="radio" aria-checked={!valor?.nombre}
          className={`rol-opcion sin-rol ${!valor?.nombre ? 'activa' : ''}`} onClick={() => onChange({ nombre: '', color: null })}>
          Sin rol
        </button>
        {roles.map(r => (
          <button key={`${r.propio ? 'p' : 'd'}-${r.nombre}`} type="button" role="radio" aria-checked={valor?.nombre === r.nombre}
            className={`rol-opcion ${valor?.nombre === r.nombre ? 'activa' : ''}`} style={{ '--rol-color': r.color }}
            onClick={() => onChange({ nombre: r.nombre, color: r.color })}>
            {r.nombre}
          </button>
        ))}
      </div>

      {propios.length > 0 && !creando && !editando && (
        <details className="roles-propios">
          <summary>Mis roles personalizados ({propios.length})</summary>
          <ul>
            {propios.map(r => (
              <li key={r.id_rol_equipo}>
                <EtiquetaRol nombre={r.nombre} color={r.color} />
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditando(r)} aria-label={`Editar el rol ${r.nombre}`}>✏️ Editar</button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => eliminar(r)} aria-label={`Eliminar el rol ${r.nombre} del catálogo`}>🗑️</button>
              </li>
            ))}
          </ul>
          <p className="form-hint" style={{ margin: 0 }}>Al editar un rol, los miembros de tus proyectos que lo tienen se actualizan.</p>
        </details>
      )}

      {creando || editando ? (
        <FormRol key={editando?.id_rol_equipo || 'nuevo'} inicial={editando} guardando={guardando}
          onGuardar={guardar} onCancelar={() => { setCreando(false); setEditando(null); }} />
      ) : (
        <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={() => setCreando(true)}>
          + Crear un rol nuevo
        </button>
      )}
    </div>
  );
}

export function CambiarRolModal({ miembro, onClose, onGuardado }) {
  const [rol, setRol] = useState({ nombre: miembro.rol_en_equipo || '', color: colorDeRol(miembro.rol_en_equipo, miembro.color_rol) });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const ref = useModalAccesible(true, guardando ? undefined : onClose);

  async function guardar(e) {
    e.preventDefault(); setGuardando(true); setError('');
    try {
      await equiposService.updateRol(miembro.id_equipo, rol.nombre, rol.nombre ? rol.color : null);
      onGuardado();
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo cambiar el rol');
      setGuardando(false);
    }
  }

  return createPortal(
    <div className="modal-overlay" onClick={guardando ? undefined : onClose}>
      <div className="modal" ref={ref} role="dialog" aria-modal="true" aria-labelledby="cambiar-rol-titulo" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
        <ModalHeader id="cambiar-rol-titulo" icono="🏷️" titulo={`Rol de ${miembro.nombre_usuario}`}
          descripcion="Elige qué papel cumple en este proyecto; la etiqueta de color lo identifica en el equipo."
          onClose={guardando ? undefined : onClose} />
        <form onSubmit={guardar}>
          <div className="modal-body">
            {error && <div className="alert alert-error" role="alert">{error}</div>}
            <span className="form-label" id="cambiar-rol-etiqueta">Rol en el proyecto</span>
            <SelectorRolEquipo valor={rol} onChange={setRol} idEtiqueta="cambiar-rol-etiqueta" />
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={guardando}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar rol'}</button>
          </div>
        </form>
      </div>
    </div>,
    portalDestino()
  );
}
