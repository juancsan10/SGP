// =====================================================
// components/ToastNotificaciones.jsx
// Alertas flotantes en tiempo real tipo toast (RF4.4 / HU-28)
// =====================================================
import { useNavigate } from 'react-router-dom';
import { useNotificaciones } from '../context/NotificacionesContext.jsx';

const TIPO_ICON = {
  mensaje: '💬',
  tarea: '✅',
  sistema: '⚙️',
  mantenimiento: '🛠️',
  advertencia: '⚠️',
  informativo: 'ℹ️',
  vencimiento: '⏰',
};

const PRIORIDAD_BORDER = {
  Alta: '#dc2626',
  Media: '#f59e0b',
  Baja: '#64748b'
};

export default function ToastNotificaciones() {
  const { toasts, eliminarToast, marcarLeida } = useNotificaciones();
  const navigate = useNavigate();

  if (!toasts || toasts.length === 0) return null;

  return (
    <div
      className="toast-container"
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column-reverse',
        gap: 12,
        pointerEvents: 'none',
        maxWidth: 380,
        width: 'calc(100vw - 48px)',
      }}
    >
      {toasts.map((toast) => {
        const icon = TIPO_ICON[toast.tipo] || '🔔';
        const borderColor = PRIORIDAD_BORDER[toast.prioridad] || '#3b82f6';

        return (
          <div
            key={toast.id}
            className="toast-card animate-slide-in"
            style={{
              pointerEvents: 'auto',
              background: 'var(--surface-overlay, #ffffff)',
              color: 'var(--text-primary, #0f172a)',
              borderRadius: 10,
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.18), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
              border: '1px solid var(--border-color, #e2e8f0)',
              borderLeft: `5px solid ${borderColor}`,
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
              animation: 'toastSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{ fontSize: 22, lineHeight: 1, marginTop: 2 }}>{icon}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: 4 }}>
                <span
                  style={{
                    fontWeight: 600,
                    fontSize: 13,
                    color: 'var(--text-primary, #0f172a)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                  title={toast.titulo}
                >
                  {toast.titulo}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: 4,
                    background: toast.prioridad === 'Alta' ? 'rgba(220, 38, 38, 0.12)' : 'rgba(100, 116, 139, 0.12)',
                    color: toast.prioridad === 'Alta' ? '#dc2626' : '#64748b',
                  }}
                >
                  {toast.prioridad}
                </span>
              </div>
              <p
                style={{
                  fontSize: 12,
                  color: 'var(--text-secondary, #475569)',
                  margin: '0 0 8px 0',
                  lineHeight: 1.4,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {toast.mensaje}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontSize: 10, color: 'var(--text-muted, #94a3b8)' }}>
                  En vivo ahora
                </span>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: 11, padding: '2px 8px', height: 'auto' }}
                  onClick={() => {
                    if (toast.id_notificacion) marcarLeida(toast.id_notificacion);
                    eliminarToast(toast.id);
                    navigate('/notificaciones');
                  }}
                >
                  Ver notificación
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={() => eliminarToast(toast.id)}
              aria-label="Cerrar notificación"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted, #94a3b8)',
                cursor: 'pointer',
                fontSize: 16,
                lineHeight: 1,
                padding: '2px 4px',
              }}
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}
