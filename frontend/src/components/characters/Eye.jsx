// =====================================================
// components/characters/Eye.jsx
// Ojo cinético: la pupila sigue el cursor (modo "track").
// Los demás modos son estados fijos disparados por LoginPage.
// =====================================================
import { useEffect, useRef } from 'react';

export default function Eye({ mode }) {
  const pupilRef = useRef(null);

  useEffect(() => {
    if (mode !== 'track') return;
    const pupil = pupilRef.current;
    if (!pupil) return;

    function handleMove(e) {
      const rect = pupil.parentElement.getBoundingClientRect();
      const angle = Math.atan2(
        e.clientY - (rect.top + rect.height / 2),
        e.clientX - (rect.left + rect.width / 2)
      );
      const radius = 7;
      pupil.style.transform = `translate(${Math.cos(angle) * radius}px, ${Math.sin(angle) * radius}px)`;
    }

    window.addEventListener('mousemove', handleMove);
    return () => window.removeEventListener('mousemove', handleMove);
  }, [mode]);

  return (
    <div className={`sgp-eye sgp-eye--${mode}`}>
      <div ref={pupilRef} className="sgp-pupil" />
    </div>
  );
}
