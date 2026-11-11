// =====================================================
// pages/SolicitudesPage.jsx  (NUEVO)
// Sección propia de Solicitudes en el menú principal.
// Antes vivía dentro de Inicio y quedaba al final de la página.
// · Administrador: bandeja para atender/rechazar solicitudes y bajas de equipo.
// · Instructor / Aprendiz: enviar solicitudes al Administrador y ver su estado.
// · Solicitudes de nuevos aprendices: el Administrador las aprueba o rechaza;
//   el Instructor ve el estado de las suyas.
// =====================================================
import { useAuth } from '../context/AuthContext.jsx';
import SolicitudesPanel from '../components/SolicitudesPanel.jsx';
import { SolicitudesAprendizAdmin, MisSolicitudesAprendiz } from '../components/SolicitudesAprendiz.jsx';

export default function SolicitudesPage() {
  const { esAdmin, esInstructor } = useAuth();

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
        {/* NUEVO (punto 10): creación de aprendices con aprobación */}
        {esAdmin && <SolicitudesAprendizAdmin />}
        {esInstructor && !esAdmin && <div style={{ marginTop: 20 }}><MisSolicitudesAprendiz /></div>}
      </div>
    </div>
  );
}
