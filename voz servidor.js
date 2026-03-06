// ==================== IMPORTACIONES ====================
import express from 'express';
import cors from 'cors';
import edgeTTS from 'edge-tts-universal'; // CORREGIDO: importación default

const app = express();
const PORT = process.env.PORT || 3000;

// ==================== CONFIGURACIÓN DE VOCES PREMIUM ====================
// Voces neurales de Microsoft - Marzo 2026
const VOCES_PREMIUM = {
  // ESPAÑOL (4 voces)
  'es-ES-ElviraNeural': 'es-ES-ElviraNeural',   // España, muy natural
  'es-MX-PaulinaNeural': 'es-MX-PaulinaNeural',  // México, neutra
  'es-ES-AlvaroNeural': 'es-ES-AlvaroNeural',   // España, profesional
  'es-ES-CarlosNeural': 'es-ES-CarlosNeural',   // España, formal

  // INGLÉS (2 voces)
  'en-US-AriaNeural': 'en-US-AriaNeural',        // Mejor voz femenina inglés
  'en-US-GuyNeural': 'en-US-GuyNeural',         // Mejor voz masculina inglés

  // RUSO (2 voces)
  'ru-RU-SvetlanaNeural': 'ru-RU-SvetlanaNeural', // Mejor voz femenina ruso
  'ru-RU-DmitryNeural': 'ru-RU-DmitryNeural'     // Mejor voz masculina ruso
};

const VOCES_VALIDAS = Object.values(VOCES_PREMIUM);

// Mapa de voz por defecto según idioma (campo 'lang')
const DEFAULT_VOICE_BY_LANG = {
  'es-ES': 'es-ES-ElviraNeural',
  'es-MX': 'es-MX-PaulinaNeural',
  'en-US': 'en-US-AriaNeural',
  'ru-RU': 'ru-RU-SvetlanaNeural'
};

// ==================== CONFIGURACIÓN DE USUARIOS Y LÍMITES ====================
const LIMITES_POR_TEXTO = {
  gratis: 3000,      // 3000 caracteres por texto
  pro: 8000,         // 8000 caracteres por texto
  dueño: Infinity    // Ilimitado para token especial
};

// INTERRUPTOR PARA LÍMITES DIARIOS (APAGADO POR DEFECTO)
const LIMITES_DIARIOS_ACTIVADOS = false;
const LIMITE_DIARIO_GRATIS = 30000; // 30,000 caracteres/día (cuando se active)

// MAPEO DE TOKENS (ejemplo inicial)
const TOKENS_ESPECIALES = {
  'token_del_dueño_123': 'dueño'
  // Aquí se irán añadiendo tokens PRO cuando haya pagos
};

function obtenerTipoUsuario(token) {
  if (!token) return 'gratis';
  if (TOKENS_ESPECIALES[token] === 'dueño') return 'dueño';
  // Por ahora, cualquier token que no sea dueño es gratis
  // En futuro: consultar DB para ver si es PRO
  return 'gratis';
}

// ==================== MIDDLEWARES ====================
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ==================== INSTANCIA TTS (SINGLETON) ====================
let ttsInstance = null;

async function getTTS() {
  if (!ttsInstance) {
    ttsInstance = await edgeTTS.createTTS(); // CORREGIDO: uso de edgeTTS.createTTS()
  }
  return ttsInstance;
}

// ==================== ENDPOINT PRINCIPAL /tts ====================
app.post('/tts', async (req, res) => {
  const startTime = Date.now();
  let logData = {};

  try {
    // 1. Extraer datos de la petición
    const { text, lang, voice, token } = req.body;

    // 2. Validar texto
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'El campo "text" es obligatorio y debe ser texto' });
    }

    // 3. Determinar tipo de usuario
    const tipoUsuario = obtenerTipoUsuario(token);
    const limiteTexto = LIMITES_POR_TEXTO[tipoUsuario];

    // 4. Validar longitud del texto
    if (text.length > limiteTexto) {
      return res.status(400).json({
        error: `Límite de caracteres excedido. Tu plan permite ${limiteTexto} caracteres por texto.`
      });
    }

    // 5. Validar voz (si se proporciona)
    let vozSeleccionada = voice;
    if (vozSeleccionada) {
      if (!VOCES_VALIDAS.includes(vozSeleccionada)) {
        return res.status(400).json({
          error: 'Voz no soportada. Consulta /voces para ver las disponibles.'
        });
      }
    } else {
      // Si no se proporciona voz, usar la predeterminada según lang
      const langKey = lang || 'es-ES';
      vozSeleccionada = DEFAULT_VOICE_BY_LANG[langKey] || 'es-ES-ElviraNeural';
    }

    // 6. (Opcional) Límites diarios - solo si el interruptor está activado
    if (LIMITES_DIARIOS_ACTIVADOS && tipoUsuario === 'gratis') {
      // Aquí se implementaría la lógica de contador diario (ej. usando Redis o memoria)
      // Por ahora, solo un placeholder
      // En el futuro se puede añadir un almacenamiento simple
    }

    // 7. Generar audio con Edge TTS
    const tts = await getTTS();
    const audioBuffer = await tts.tts(text, vozSeleccionada);

    // 8. Registrar log exitoso
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

    // 9. Enviar respuesta con audio
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

// ==================== ENDPOINT DE INFORMACIÓN ====================
app.get('/', (req, res) => {
  res.json({
    nombre: 'MiAudioFiel',
    version: '2.0.0',
    descripcion: 'Backend de texto a voz con voces neurales gratuitas (Edge TTS)',
    endpoints: {
      tts: {
        metodo: 'POST',
        ruta: '/tts',
        body: {
          text: 'string (obligatorio)',
          lang: 'string (opcional, ej: es-ES)',
          voice: 'string (opcional, una de las voces listadas en /voces)',
          token: 'string (opcional, token de usuario)'
        }
      },
      voces: {
        metodo: 'GET',
        ruta: '/voces'
      }
    },
    limites: {
      gratis: LIMITES_POR_TEXTO.gratis + ' caracteres por texto',
      pro: LIMITES_POR_TEXTO.pro + ' caracteres por texto',
      dueño: 'Ilimitado'
    },
    interruptorLimitesDiarios: LIMITES_DIARIOS_ACTIVADOS ? 'ACTIVADO' : 'DESACTIVADO'
  });
});

// ==================== ENDPOINT DE LISTA DE VOCES ====================
app.get('/voces', (req, res) => {
  const listaVoces = Object.keys(VOCES_PREMIUM).map(nombreComun => ({
    id: VOCES_PREMIUM[nombreComun],
    descripcion: obtenerDescripcionVoz(nombreComun)
  }));

  res.json({
    total: listaVoces.length,
    voces: listaVoces
  });
});

function obtenerDescripcionVoz(nombre) {
  const descripciones = {
    'es-ES-ElviraNeural': 'Español (España) - Mujer, muy natural',
    'es-MX-PaulinaNeural': 'Español (México) - Mujer, neutra',
    'es-ES-AlvaroNeural': 'Español (España) - Hombre, profesional',
    'es-ES-CarlosNeural': 'Español (España) - Hombre, formal',
    'en-US-AriaNeural': 'Inglés (EE.UU.) - Mujer, mejor voz femenina',
    'en-US-GuyNeural': 'Inglés (EE.UU.) - Hombre, mejor voz masculina',
    'ru-RU-SvetlanaNeural': 'Ruso (Rusia) - Mujer, mejor voz femenina',
    'ru-RU-DmitryNeural': 'Ruso (Rusia) - Hombre, mejor voz masculina'
  };
  return descripciones[nombre] || 'Voz neural de alta calidad';
}

// ==================== INICIO DEL SERVIDOR ====================
app.listen(PORT, () => {
  console.log('==========================================');
  console.log('🚀 MiAudioFiel - Backend TTS con Edge TTS');
  console.log('==========================================');
  console.log(`📡 Puerto: ${PORT}`);
  console.log(`🌐 http://localhost:${PORT}`);
  console.log(`✅ Endpoints:`);
  console.log(`   - POST /tts`);
  console.log(`   - GET  /`);
  console.log(`   - GET  /voces`);
  console.log(`✅ Voces premium: 8`);
  console.log(`✅ Límite gratis: ${LIMITES_POR_TEXTO.gratis} caracteres/texto`);
  console.log(`✅ Límites diarios: ${LIMITES_DIARIOS_ACTIVADOS ? 'ACTIVADOS' : 'DESACTIVADOS'}`);
  console.log('==========================================');
});