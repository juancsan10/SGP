// =====================================================
// utils/formatoMensaje.jsx  (NUEVO — punto 6, #19)
// Formato de mensajes estilo WhatsApp, sin HTML (no usa
// dangerouslySetInnerHTML: todo se arma como elementos de React).
//   *negrita*   _cursiva_   ~tachado~   `código`   enlaces http(s)
//   Líneas que empiezan con "- " o "• " se muestran como lista.
// =====================================================

const PATRON = /(\*[^*\n]+\*|_[^_\n]+_|~[^~\n]+~|`[^`\n]+`|https?:\/\/[^\s<]+)/g;

function enLinea(texto, claveBase) {
  const partes = [];
  let ultimo = 0;
  let m;
  PATRON.lastIndex = 0;
  while ((m = PATRON.exec(texto)) !== null) {
    if (m.index > ultimo) partes.push(texto.slice(ultimo, m.index));
    const t = m[0];
    const k = `${claveBase}-${m.index}`;
    if (t.startsWith('http')) {
      // Quita puntuación final que no forma parte del enlace.
      const url = t.replace(/[.,;:!?)]+$/, '');
      partes.push(<a key={k} href={url} target="_blank" rel="noopener noreferrer">{url}</a>);
      if (url.length < t.length) partes.push(t.slice(url.length));
    } else {
      const interior = t.slice(1, -1);
      const Etiqueta = { '*': 'strong', _: 'em', '~': 's', '`': 'code' }[t[0]];
      partes.push(<Etiqueta key={k}>{interior}</Etiqueta>);
    }
    ultimo = m.index + t.length;
  }
  if (ultimo < texto.length) partes.push(texto.slice(ultimo));
  return partes;
}

export function renderFormato(texto) {
  const lineas = String(texto || '').split('\n');
  const bloques = [];
  let lista = null;
  lineas.forEach((linea, i) => {
    const item = linea.match(/^\s*[-•]\s+(.*)$/);
    if (item) {
      if (!lista) { lista = []; bloques.push({ tipo: 'lista', items: lista, i }); }
      lista.push(item[1]);
    } else {
      lista = null;
      bloques.push({ tipo: 'linea', texto: linea, i });
    }
  });
  return bloques.map((b, n) => {
    if (b.tipo === 'lista') {
      return <ul key={`l${b.i}`} className="msg-lista">{b.items.map((t, j) => <li key={j}>{enLinea(t, `l${b.i}-${j}`)}</li>)}</ul>;
    }
    return (
      <span key={`t${b.i}`} className="msg-linea">
        {enLinea(b.texto, `t${b.i}`)}
        {n < bloques.length - 1 && bloques[n + 1].tipo !== 'lista' ? <br /> : null}
      </span>
    );
  });
}

// Texto plano (para citas y vistas previas): quita los marcadores.
export function textoPlano(texto) {
  return String(texto || '').replace(/[*_~`]([^*_~`\n]+)[*_~`]/g, '$1').replace(/\s+/g, ' ').trim();
}

// Envuelve la selección de un textarea con un marcador (*, _, ~, `).
export function envolverSeleccion(textarea, valor, marcador) {
  const inicio = textarea?.selectionStart ?? valor.length;
  const fin = textarea?.selectionEnd ?? valor.length;
  const elegido = valor.slice(inicio, fin) || 'texto';
  const nuevo = `${valor.slice(0, inicio)}${marcador}${elegido}${marcador}${valor.slice(fin)}`;
  return { valor: nuevo, inicio: inicio + marcador.length, fin: inicio + marcador.length + elegido.length };
}
