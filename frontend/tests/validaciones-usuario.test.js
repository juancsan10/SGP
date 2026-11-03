import { describe, it, expect } from 'vitest';
import {
  validarNombre,
  validarCorreo,
  validarCc,
  validarPassword,
} from '../src/utils/validaciones.js';

describe('validaciones de usuario (lógica pura)', () => {
  describe('validarNombre - análisis de valores límite', () => {
    it('rechaza nombres con 1 carácter (límite inferior - 1)', () => {
      expect(validarNombre('a')).toBe(false);
    });

    it('acepta nombres con exactamente 2 caracteres (límite inferior)', () => {
      expect(validarNombre('ab')).toBe(true);
    });

    it('acepta nombres con exactamente 100 caracteres (límite superior)', () => {
      const nombre100 = 'a'.repeat(100);
      expect(validarNombre(nombre100)).toBe(true);
    });

    it('rechaza nombres con 101 caracteres (límite superior + 1)', () => {
      const nombre101 = 'a'.repeat(101);
      expect(validarNombre(nombre101)).toBe(false);
    });

    it('maneja espacios en blanco correctamente en los extremos', () => {
      expect(validarNombre('   ab   ')).toBe(true);
      expect(validarNombre('   a   ')).toBe(false);
      expect(validarNombre('')).toBe(false);
      expect(validarNombre(null)).toBe(false);
    });
  });

  describe('validarCc - análisis de valores límite y mutantes', () => {
    // DOCUMENTACIÓN DEL MUTANTE:
    // Si un desarrollador o mutante cambia la expresión regular de /^[0-9]{5,15}$/ a /^[0-9]{4,15}$/,
    // este test con 4 dígitos fallaría (el mutante retornaría true cuando debe ser false), matando el mutante.
    it('rechaza cédulas de 4 dígitos (límite inferior - 1, mata el mutante {4,15})', () => {
      expect(validarCc('1234')).toBe(false);
    });

    it('acepta cédulas de exactamente 5 dígitos (límite inferior)', () => {
      expect(validarCc('12345')).toBe(true);
    });

    it('acepta cédulas de exactamente 15 dígitos (límite superior)', () => {
      expect(validarCc('123456789012345')).toBe(true);
    });

    it('rechaza cédulas de 16 dígitos (límite superior + 1)', () => {
      expect(validarCc('1234567890123456')).toBe(false);
    });

    it('rechaza cédulas con letras, espacios intermedios o caracteres especiales', () => {
      expect(validarCc('1234a')).toBe(false);
      expect(validarCc('123 45')).toBe(false);
      expect(validarCc('12.345')).toBe(false);
      expect(validarCc(null)).toBe(false);
    });
  });

  describe('validarPassword - análisis de valores límite', () => {
    it('rechaza contraseñas con 7 caracteres aunque tengan letra y número (límite inferior - 1)', () => {
      expect(validarPassword('Pass123')).toBe(false);
    });

    it('acepta contraseñas con exactamente 8 caracteres con letra y número (límite inferior)', () => {
      expect(validarPassword('Pass1234')).toBe(true);
    });

    it('rechaza contraseñas sin números aunque tengan 8 o más caracteres', () => {
      expect(validarPassword('PasswordSegura')).toBe(false);
    });

    it('rechaza contraseñas sin letras aunque tengan 8 o más números', () => {
      expect(validarPassword('12345678')).toBe(false);
    });

    it('maneja valores no válidos de forma segura', () => {
      expect(validarPassword('')).toBe(false);
      expect(validarPassword(null)).toBe(false);
    });
  });

  describe('validarCorreo', () => {
    it('acepta correos institucionales y personales con formato válido', () => {
      expect(validarCorreo('carlos.herrera@sgpsena.local')).toBe(true);
      expect(validarCorreo('aprendiz@sena.edu.co')).toBe(true);
    });

    it('rechaza correos con formato inválido o vacíos', () => {
      expect(validarCorreo('sin-arroba.com')).toBe(false);
      expect(validarCorreo('arroba@sin-dominio')).toBe(false);
      expect(validarCorreo('   ')).toBe(false);
      expect(validarCorreo(null)).toBe(false);
    });
  });
});
