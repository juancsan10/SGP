// =====================================================
// components/characters/Character.jsx
// Figura geométrica de la escena del login, con ojos y
// boca reactivos al estado del formulario.
// =====================================================
import Eye from './Eye.jsx';

const REACTION_TO_EYE = {
  side: 'side',
  closed: 'closed',
  surprise: 'surprise',
  happy: 'happy',
};

export default function Character({ reaction, variant, tone, tilted, delay = 0 }) {
  const eyeMode = REACTION_TO_EYE[reaction] || 'track';

  return (
    <div
      className={`sgp-character sgp-character--${variant} sgp-character--${tone} ${
        tilted ? 'is-tilted' : ''
      }`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="sgp-character__eyes">
        <Eye mode={eyeMode} />
        <Eye mode={eyeMode} />
      </div>
      <div className={`sgp-character__mouth sgp-character__mouth--${reaction || 'idle'}`} />
    </div>
  );
}
