// ==================== IMPORTACIONES ====================
import express from 'express';
import cors from 'cors';
import edgeTTS from 'edge-tts-universal'; // ✅ CORRECTO - Importación default

const app = express();
const PORT = process.env.PORT || 3000;

// ==================== CONFIGURACIÓN DE VOCES PREMIUM ====================
// Voces neurales de Microsoft - Marzo 2026
const VOCES_PREMIUM = {
  // ESPAÑOL (4 voces)
  'es-ES-ElviraNeural': 'es-ES-ElviraNeural',
  'es-MX-PaulinaNeural': 'es-MX-PaulinaNeural',
  'es-ES-AlvaroNeural': 'es-ES-AlvaroNeural',
  'es-ES-CarlosNeural': 'es-ES-CarlosNeural',

  // INGLÉS (2 voces)
  'en-US-AriaNeural': 'en-US-AriaNeural',
  'en-US-GuyNeural': 'en-US-GuyNeural',

  // RUSO (2 voces)
  'ru-RU-SvetlanaNeural': 'ru-RU-SvetlanaNeural',
  'ru-RU-DmitryNeural': 'ru-RU-DmitryNeural'
};

const VOCES_VALIDAS = Object.values(VOCES_PREMIUM);

const DEFAULT_VOICE_BY_LANG = {
  'es-ES': 'es-ES-ElviraNeural',
  'es-MX': 'es-MX-PaulinaNeural',
  'en-US': 'en-US-AriaNeural',
  'ru-RU': 'ru-RU-SvetlanaNeural'
};

// ==================== CONFIGURACIÓN DE USUARIOS Y LÍMITES ====================
const LIMITES_POR_TEXTO = {
  gratis: 3000,
  pro: 8000,
  dueño: Infinity
};

const LIMITES_DIARIOS_ACTIVADOS = false;
const LIMITE_DIARIO_GRATIS = 30000;

const TOKENS_ESPECIALES = {
  'token_del_dueño_123': 'dueño'
};

function obtenerTipoUsuario(token) {
  if (!token) return 'gratis';
  if (TOKENS_ESPECIALES[token] === 'dueño') return 'dueño';
  return 'gratis';
}

// ==================== MIDDLEWARES ====================
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ==================== ENDPOINT PRINCIPAL /tts ====================
app.post('/tts', async (req, res) => {
  const startTime = Date.now();
  let logData = {};

  try {
    const { text, lang, voice, token } = req.body;

    // Validar texto
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'El campo "text" es obligatorio' });
    }

    // Validar tipo de usuario y límites
    const tipoUsuario = obtenerTipoUsuario(token);
    const limiteTexto = LIMITES_POR_TEXTO[tipoUsuario];

    if (text.length > limiteTexto) {
      return res.status(400).json({
        error: `Límite excedido. Tu plan permite ${limiteTexto} caracteres`
      });
    }

    // Validar/Seleccionar voz
    let vozSeleccionada = voice;
    if (vozSeleccionada) {
      if (!VOCES_VALIDAS.includes(vozSeleccionada)) {
        return res.status(400).json({ error: 'Voz no soportada' });
      }
    } else {
      const langKey = lang || 'es-ES';
      vozSeleccionada = DEFAULT_VOICE_BY_LANG[langKey] || 'es-ES-ElviraNeural';
    }

    // ✅ SOLUCIÓN: LLAMADA DIRECTA A LA LIBRERÍA
    const audioBuffer = await edgeTTS.tts(text, vozSeleccionada);

    // Log exitoso
    logData = {
      timestamp: new Date().toISOString(),
      ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      tipoUsuario,
      caracteres: text.length,
      idioma: lang || 'es-ES',
      voz: vozSeleccionada,
      tiempoMs: Date.now() - startTime,
      token: token || 'sin_token',
      exito: true
    };
    console.log(JSON.stringify(logData));

    // Enviar audio
    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Disposition': 'inline; filename="audio.mp3"',
      'Content-Length': audioBuffer.length
    });
    res.send(audioBuffer);

  } catch (error) {
    // Log de error
    logData = {
      timestamp: new Date().toISOString(),
      ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      token: req.body?.token || 'sin_token',
      error: error.message,
      exito: false
    };
    console.error(JSON.stringify(logData));

    res.status(500).json({
      error: 'Error al generar audio',
      details: error.message
    });
  }
});

// ==================== ENDPOINTS DE INFORMACIÓN ====================
app.get('/', (req, res) => {
  res.json({
    nombre: 'MiAudioFiel',
    version: '2.0.1', // Versión corregida
    descripcion: 'Backend TTS con Edge TTS',
    endpoints: {
      tts: 'POST /tts',
      voces: 'GET /voces'
    }
  });
});

app.get('/voces', (req, res) => {
  const listaVoces = Object.keys(VOCES_PREMIUM).map(nombreComun => ({
    id: VOCES_PREMIUM[nombreComun],
    descripcion: obtenerDescripcionVoz(nombreComun)
  }));

  res.json({ total: listaVoces.length, voces: listaVoces });
});

function obtenerDescripcionVoz(nombre) {
  const descripciones = {
    'es-ES-ElviraNeural': 'Español (España) - Mujer, muy natural',
    'es-MX-PaulinaNeural': 'Español (México) - Mujer, neutra',
    'es-ES-AlvaroNeural': 'Español (España) - Hombre, profesional',
    'es-ES-CarlosNeural': 'Español (España) - Hombre, formal',
    'en-US-AriaNeural': 'Inglés (EE.UU.) - Mujer',
    'en-US-GuyNeural': 'Inglés (EE.UU.) - Hombre',
    'ru-RU-SvetlanaNeural': 'Ruso (Rusia) - Mujer',
    'ru-RU-DmitryNeural': 'Ruso (Rusia) - Hombre'
  };
  return descripciones[nombre] || 'Voz neural';
}

// ==================== INICIO DEL SERVIDOR ====================
app.listen(PORT, () => {
  console.log('==========================================');
  console.log('🚀 MiAudioFiel - VERSIÓN CORREGIDA 2.0.1');
  console.log('==========================================');
  console.log(`✅ Error createTTS ELIMINADO`);
  console.log(`✅ Llamada directa a edgeTTS.tts()`);
  console.log(`📡 Puerto: ${PORT}`);
  console.log('==========================================');
});
