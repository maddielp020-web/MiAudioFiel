// ==================== MiAudioFiel TTS Backend v2.0.4 ====================
// FIX: rate='0%' → rate=0 (formato correcto EdgeTTS 2026)

import express from 'express';
import cors from 'cors';
import { UniversalEdgeTTS } from 'edge-tts-universal';

const app = express();
const PORT = process.env.PORT || 3000;

// ==================== CONFIGURACIÓN ====================
const LIMITES = {
  gratis: 2500,
  pro: 10000,
  dueño: Infinity
};

const VOCES_DISPONIBLES = [
  'es-ES-ElviraNeural', 'es-ES-AlvaroNeural', 'es-MX-PaulinaNeural',
  'en-US-AriaNeural', 'en-US-GuyNeural', 
  'ru-RU-SvetlanaNeural', 'ru-RU-DmitryNeural'
];

const VOCES_DEFECTO = {
  'es': 'es-ES-ElviraNeural',
  'en': 'en-US-AriaNeural', 
  'ru': 'ru-RU-SvetlanaNeural'
};

const TOKENS = {
  'token_dueño_123': 'dueño'
};

function getUsuario(token) {
  return TOKENS[token] || (!token ? 'gratis' : 'gratis');
}

function getIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
}

// ==================== MIDDLEWARE ====================
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ==================== ENDPOINT /tts ====================
app.post('/tts', async (req, res) => {
  const inicio = Date.now();
  
  try {
    const { text, lang = 'es', voice, token } = req.body;
    
    // VALIDACIÓN BÁSICA
    if (!text?.trim()) {
      return res.status(400).json({ error: 'Texto requerido' });
    }
    
    const texto = text.trim();
    const chars = texto.length;
    const usuario = getUsuario(token);
    const maxChars = LIMITES[usuario];
    
    if (chars > maxChars) {
      return res.status(400).json({ 
        error: `Límite ${usuario}: ${maxChars} chars`,
        actual: chars 
      });
    }
    
    // VOZ
    let voz = voice || VOCES_DEFECTO[lang.slice(0,2)] || 'es-ES-ElviraNeural';
    if (!VOCES_DISPONIBLES.includes(voz)) {
      voz = 'es-ES-ElviraNeural';
    }
    
    const ip = getIP(req);
    console.log(`🎙️ [${ip}] ${usuario} | ${chars}c | ${voz}`);
    
    // ========== EDGE TTS CORREGIDO ==========
    const tts = new UniversalEdgeTTS(texto, voz, {
      rate: 0,           // ✅ FIX: NUMERO, no string '0%'
      pitch: 0,          // ✅ NUMERO
      volume: 0          // ✅ NUMERO
    });
    
    const resultado = await tts.synthesize();
    const buffer = Buffer.from(await resultado.audio.arrayBuffer());
    
    const tiempo = Date.now() - inicio;
    console.log(`✅ [${ip}] OK | ${buffer.length}B | ${tiempo}ms`);
    
    // RESPUESTA
    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Disposition': 'inline; filename="audio.mp3"',
      'Content-Length': buffer.length
    });
    res.send(buffer);
    
  } catch (err) {
    const ip = getIP(req);
    const tiempo = Date.now() - inicio;
    console.error(`❌ [${ip}] ${err.message} (${tiempo}ms)`);
    
    res.status(500).json({
      error: 'TTS falló',
      detalles: err.message
    });
  }
});

// ==================== INFO ====================
app.get('/', (req, res) => res.json({ 
  ok: true, 
  version: '2.0.4-FIXED',
  voces: VOCES_DISPONIBLES.length 
}));

app.get('/voces', (req, res) => res.json(VOCES_DISPONIBLES));

app.listen(PORT, () => {
  console.log('🚀 MiAudioFiel TTS v2.0.4');
  console.log(`📡 Puerto ${PORT}`);
  console.log('✅ FIX: rate=0 (número)');
});
