import { useNavigate } from 'react-router-dom';
import PasswordRecovery from '../components/PasswordRecovery.jsx';

// Ruta /reset-password: misma experiencia de recuperación (código por correo) a pantalla completa.
export default function ResetPasswordPage() {
  const nav = useNavigate();
  return <PasswordRecovery embedded onClose={() => nav('/login')} onDone={() => nav('/login')} />;
}
