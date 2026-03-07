// ==================== MODO PROFESIONAL (EDGE TTS) ====================
import { getToken } from './utils.js';

// Configuración del backend (cambiar por tu URL de Render)
const BACKEND_URL = 'https://miaudiofiel-backend.onrender.com'; // ACTUALIZAR

/**
 * Genera audio usando el backend Edge TTS
 * @param {string} text - Texto a convertir
 * @param {string} voice - Voz seleccionada (ej. "es-ES-ElviraNeural")
 * @param {string} speed - Velocidad ("0" normal, "-20%" lento, "20%" rápido)
 * @param {string} token - Token opcional (PRO o dueño)
 * @returns {Promise<Blob>} - Audio en formato MP3
 */
export async function generarAudio(text, voice, speed = '0', token = null) {
  console.log('🎙️ Modo Pro: generando audio...', { textLength: text.length, voice, speed });

  // Mapear velocidad a número (el backend espera un float, ej. 1.0, 0.8, 1.2)
  let speedValue = 1.0;
  if (speed === '-20%') speedValue = 0.8;
  if (speed === '20%') speedValue = 1.2;

  const payload = {
    text,
    voice,
    speed: speedValue
  };

  // Si hay token, incluirlo
  if (token) {
    payload.token = token;
  }

  try {
    const response = await fetch(`${BACKEND_URL}/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Error HTTP ${response.status}`);
    }

    const audioBlob = await response.blob();
    console.log('✅ Audio recibido, tamaño:', audioBlob.size, 'bytes');
    return audioBlob;
  } catch (error) {
    console.error('❌ Error en Modo Pro:', error.message);
    throw error;
  }
}

// ==================== LOGS DE VERIFICACIÓN ====================
console.log('✅ modo-pro.js cargado');
