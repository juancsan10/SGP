// =====================================================
// pages/SolicitudesPage.jsx  (NUEVO)
// Sección propia de Solicitudes en el menú principal.
// Antes vivía dentro de Inicio y quedaba al final de la página.
// · Administrador: bandeja para atender/rechazar solicitudes y bajas de equipo.
// · Instructor / Aprendiz: enviar solicitudes al Administrador y ver su estado.
// =====================================================
import { useAuth } from '../context/AuthContext.jsx';
import SolicitudesPanel from '../components/SolicitudesPanel.jsx';

export default function SolicitudesPage() {
  const { esAdmin } = useAuth();

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Solicitudes</h1>
          <p className="page-subtitle">
            {esAdmin
              ? 'Atiende o rechaza lo que piden instructores y aprendices, y resuelve las bajas de equipo.'
              : 'Envía solicitudes al Administrador y revisa su estado y respuesta.'}
          </p>
        </div>
      </div>
      <div className="page-body">
        <SolicitudesPanel esAdmin={esAdmin} />
      </div>
    </div>
  );
}
