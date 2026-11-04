import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { contienePalabraProhibida } = require('../src/utils/glosario-prohibido');

describe('contienePalabraProhibida', () => {
  it('should return null when the text is clean', () => {
    expect(contienePalabraProhibida('Ya subí el avance de la fase 2')).toBeNull();
  });

  it('should detect a forbidden word written in uppercase and without accent', () => {
    // Arrange
    const texto = 'Eres un ESTUPIDO';

    // Act
    const palabra = contienePalabraProhibida(texto);

    // Assert
    expect(palabra).toBe('estupido');
  });

  it('should detect a forbidden word with accent when the list has it without accent', () => {
    expect(contienePalabraProhibida('qué inútil')).not.toBeNull();
  });

  it.each([
    ['custodio', 'El custodio del repositorio es Juan'],   // contiene "odio"
    ['php', 'El backend viejo estaba en PHP'],              // contiene "hp"
    ['putativo', 'Es el padre putativo del módulo'],       // contiene "puta"
  ])('should not block a valid word that contains a forbidden one (%s)', (_palabra, texto) => {
    expect(contienePalabraProhibida(texto)).toBeNull();
  });

  it.each([null, undefined, '', 123])('should return null when the input is %o', (valor) => {
    expect(contienePalabraProhibida(valor)).toBeNull();
  });
});
