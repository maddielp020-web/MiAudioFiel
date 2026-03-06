// ==================== MiAudioFiel TTS Backend v2.0.3 ====================
// Backend completo TTS con Edge TTS Universal - Marzo 2026
// Desplegable en Render FREE - Listo para producción

import express from 'express';
import cors from 'cors';
import { UniversalEdgeTTS } from 'edge-tts-universal';

const app = express();
const PORT = process.env.PORT || 3000;

// ==================== CONFIGURACIÓN NEGOCIO ====================
const LIMITES = {
  gratis: 2500,  // caracteres por texto
  pro: 10000,
  dueño: Infinity
};

const VOCES_DISPONIBLES = [
  // ESPAÑOL
  'es-ES-ElviraNeural',
  'es-ES-AlvaroNeural', 
  'es-MX-PaulinaNeural',
  'es-ES-CarlosNeural',
  
  // INGLÉS
  'en-US-AriaNeural',
  'en-US-GuyNeural',
  
  // RUSO
  'ru-RU-SvetlanaNeural',
  'ru-RU-DmitryNeural'
];

const VOCES_POR_DEFECTO = {
  'es': 'es-ES-ElviraNeural',
  'en': 'en-US-AriaNeural', 
  'ru': 'ru-RU-SvetlanaNeural'
};

const TOKENS_ESPECIALES = {
  'token_dueño_123': 'dueño'  // Cambia esto por tu token real
};

function getTipoUsuario(token) {
  if (!token) return 'gratis';
  return TOKENS_ESPECIALES[token] || 'gratis';
}

function getIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
         req.socket?.remoteAddress || 'desconocida';
}

// ==================== MIDDLEWARE ====================
app.use(cors({
  origin: '*',  // Ajusta después para producción
  methods: ['POST', 'GET']
}));
app.use(express.json({ limit: '10mb' }));

// ==================== ENDPOINT PRINCIPAL /tts ====================
app.post('/tts', async (req, res) => {
  const inicio = Date.now();
  
  try {
    const { text, lang = 'es', voice, token } = req.body;
    
    // 1. VALIDAR TEXTO
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ 
        error: 'Texto requerido',
        max_chars_gratis: LIMITES.gratis 
      });
    }
    
    const textoLimpio = text.trim();
    const chars = textoLimpio.length;
    
    // 2. TIPO DE USUARIO Y LÍMITE
    const tipoUsuario = getTipoUsuario(token);
    const limiteMax = LIMITES[tipoUsuario];
    
    if (chars > limiteMax) {
      return res.status(400).json({
        error: `Límite excedido (${tipoUsuario})`,
        max_permitido: limiteMax,
        tiene: chars
      });
    }
    
    // 3. SELECCIONAR VOZ
    let vozFinal = voice;
    
    if (!vozFinal) {
      const idioma = lang.toLowerCase().substring(0, 2);
      vozFinal = VOCES_POR_DEFECTO[idioma] || 'es-ES-ElviraNeural';
    }
    
    if (!VOCES_DISPONIBLES.includes(vozFinal)) {
      return res.status(400).json({
        error: 'Voz inválida',
        voces_disponibles: VOCES_DISPONIBLES.slice(0, 4)  // Solo primeras 4
      });
    }
    
    const ip = getIP(req);
    console.log(`🎙️ [${ip}] ${tipoUsuario} | ${chars} chars | ${vozFinal}`);
    
    // 4. EDGE TTS CORRECTO (API oficial 2026)
    const tts = new UniversalEdgeTTS(textoLimpio, vozFinal, {
      rate: '0%',           // Velocidad normal
      pitch: '+0Hz',        // Tono normal
      volume: '0%',         // Volumen normal
      voice: vozFinal
    });
    
    const resultado = await tts.synthesize();
    const audioBuffer = Buffer.from(await resultado.audio.arrayBuffer());
    
    const tiempoTotal = Date.now() - inicio;
    console.log(`✅ [${ip}] OK | ${audioBuffer.length} bytes | ${tiempoTotal}ms`);
    
    // 5. RESPUESTA CON AUDIO
    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Disposition': 'inline; filename="audiofiel.mp3"',
      'Content-Length': audioBuffer.length,
      'Cache-Control': 'public, max-age=3600'
    });
    
    res.send(audioBuffer);
    
  } catch (error) {
    const ip = getIP(req);
    const tiempoTotal = Date.now() - inicio;
    
    console.error(`❌ [${ip}] ERROR (${tiempoTotal}ms):`, error.message);
    
    res.status(500).json({
      error: 'Error TTS',
      detalles: error.message?.substring(0, 100),
      codigo: 'TTS_500'
    });
  }
});

// ==================== ENDPOINTS AUXILIARES ====================
app.get('/', (req, res) => {
  res.json({
    nombre: 'MiAudioFiel TTS',
    version: '2.0.3-FINAL',
    estado: '🟢 FUNCIONANDO',
    endpoints: ['POST /tts', 'GET /voces']
  });
});

app.get('/voces', (req, res) => {
  res.json({
    total: VOCES_DISPONIBLES.length,
    premium: VOCES_DISPONIBLES,
    por_defecto: {
      es: 'es-ES-ElviraNeural',
      en: 'en-US-AriaNeural',
      ru: 'ru-RU-SvetlanaNeural'
    }
  });
});

// ==================== INICIO SERVIDOR ====================
app.listen(PORT, () => {
  console.log('🚀 MiAudioFiel TTS v2.0.3');
  console.log('📡 http://localhost:' + PORT);
  console.log('✅ EdgeTTS Universal - Listo');
  console.log('🟢 GET / | POST /tts | GET /voces');
});
