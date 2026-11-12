import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { envolverSeleccion, renderFormato, textoPlano } from '../src/utils/formatoMensaje.jsx';

const html = (texto) => render(<div>{renderFormato(texto)}</div>).container.innerHTML;

describe('formato de mensajes (estilo WhatsApp)', () => {
  it('should turn the WhatsApp markers into bold, italic, strike and code', () => {
    const salida = html('*listo* _casi_ ~viejo~ `npm test`');
    expect(salida).toContain('<strong>listo</strong>');
    expect(salida).toContain('<em>casi</em>');
    expect(salida).toContain('<s>viejo</s>');
    expect(salida).toContain('<code>npm test</code>');
  });

  it('should never render HTML written by the user', () => {
    const salida = html('<img src=x onerror=alert(1)> *hola*');
    expect(salida).not.toContain('<img');
    expect(salida).toContain('&lt;img');
  });

  it('should turn links into safe anchors without the final punctuation', () => {
    const { container } = render(<div>{renderFormato('Mira https://github.com/juancsan10/SGP.')}</div>);
    const a = container.querySelector('a');
    expect(a).toHaveAttribute('href', 'https://github.com/juancsan10/SGP');
    expect(a).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('should not turn javascript: links into anchors', () => {
    expect(html('javascript:alert(1)')).not.toContain('<a');
  });

  it('should render lines starting with a dash as a list', () => {
    const { container } = render(<div>{renderFormato('Pendientes:\n- Login\n- Modelo ER')}</div>);
    expect([...container.querySelectorAll('li')].map(li => li.textContent)).toEqual(['Login', 'Modelo ER']);
  });

  it('should strip the markers for quotes and previews', () => {
    expect(textoPlano('*Hola*  _equipo_\nfin')).toBe('Hola equipo fin');
  });

  it('should wrap the selected text with the marker', () => {
    const textarea = { selectionStart: 4, selectionEnd: 9 };
    expect(envolverSeleccion(textarea, 'Hay clase hoy', '*')).toEqual({ valor: 'Hay *clase* hoy', inicio: 5, fin: 10 });
  });
});
