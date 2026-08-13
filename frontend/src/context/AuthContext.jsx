// =====================================================
// context/AuthContext.jsx
// Contexto global de autenticación – proveedor del usuario
// =====================================================
import { createContext, useContext, useState, useCallback } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Recuperar sesión guardada en localStorage
  const [usuario, setUsuario] = useState(() => {
    try {
      const saved = localStorage.getItem('sgp_usuario');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Llamado después de un login exitoso
  const login = useCallback((token, datosUsuario) => {
    localStorage.setItem('sgp_token', token);
    localStorage.setItem('sgp_usuario', JSON.stringify(datosUsuario));
    setUsuario(datosUsuario);
  }, []);

  // Cerrar sesión
  const logout = useCallback(() => {
    localStorage.removeItem('sgp_token');
    localStorage.removeItem('sgp_usuario');
    setUsuario(null);
  }, []);

  // Helpers de rol
  const esAdmin      = usuario?.rol === 'Administrador';
  const esInstructor = usuario?.rol === 'Instructor';
  const esAprendiz   = usuario?.rol === 'Aprendiz';

  return (
    <AuthContext.Provider value={{ usuario, login, logout, esAdmin, esInstructor, esAprendiz }}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook de consumo rápido
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
