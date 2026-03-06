// ==================== DEPENDENCIAS ====================
const express = require('express');
const say = require('say');
const { Readable } = require('stream');

const app = express();
const PORT = process.env.PORT || 3000;

// ==================== CONFIGURACIÓN ====================
app.use(express.json({ limit: '10mb' }));

// Límite de caracteres para no saturar CPU en Render gratis
const MAX_CHARS = 5000;

// Mapa de idiomas soportados por say.js (voz de eSpeak)
const VOICE_MAP = {
    es: 'spanish',
    ru: 'russian',
    en: 'english'
};

// ==================== FUNCIÓN TTS EN MEMORIA ====================
function textToSpeechBuffer(text, lang = 'es', speed = 1.0) {
    return new Promise((resolve, reject) => {
        const voice = VOICE_MAP[lang] || VOICE_MAP.es;
        
        // say.js exporta el audio a un archivo temporal por defecto
        // pero podemos capturarlo usando streams o exportando a Buffer
        // Estrategia: usar un archivo temporal único y luego leerlo como Buffer
        const tempFile = `/tmp/audio-${Date.now()}.wav`;
        
        say.export(text, voice, speed, tempFile, (err) => {
            if (err) {
                reject(err);
                return;
            }
            
            // Leer el archivo temporal como Buffer
            const fs = require('fs');
            fs.readFile(tempFile, (err, data) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                // Eliminar archivo temporal después de leer
                fs.unlink(tempFile, () => {});
                
                resolve(data);
            });
        });
    });
}

// ==================== ENDPOINT PRINCIPAL ====================
app.post('/tts', async (req, res) => {
    console.log('📢 Petición TTS recibida');
    
    try {
        // 1. Validar entrada
        const { text, lang = 'es', speed = 1.0 } = req.body;
        
        if (!text) {
            console.log('❌ Error: Texto vacío');
            return res.status(400).json({ error: 'El texto es obligatorio' });
        }
        
        if (text.length > MAX_CHARS) {
            console.log(`❌ Error: Texto demasiado largo (${text.length} caracteres)`);
            return res.status(400).json({ 
                error: `El texto excede el límite de ${MAX_CHARS} caracteres` 
            });
        }
        
        // 2. Validar idioma
        if (lang && !VOICE_MAP[lang]) {
            console.log(`❌ Error: Idioma no soportado (${lang})`);
            return res.status(400).json({ 
                error: 'Idioma no soportado. Usa: es, ru, en' 
            });
        }
        
        // 3. Validar velocidad
        if (speed && (speed < 0.5 || speed > 2.0)) {
            console.log(`❌ Error: Velocidad inválida (${speed})`);
            return res.status(400).json({ 
                error: 'La velocidad debe estar entre 0.5 y 2.0' 
            });
        }
        
        console.log(`✅ Procesando: ${text.length} caracteres, idioma: ${lang}, velocidad: ${speed}`);
        
        // 4. Generar audio en Buffer
        const audioBuffer = await textToSpeechBuffer(text, lang, speed);
        
        console.log(`✅ Audio generado: ${audioBuffer.length} bytes`);
        
        // 5. Enviar respuesta
        res.set({
            'Content-Type': 'audio/wav',
            'Content-Disposition': 'inline; filename="audio.wav"',
            'Content-Length': audioBuffer.length
        });
        
        res.send(audioBuffer);
        
        console.log('✅ Respuesta enviada correctamente');
        
    } catch (error) {
        console.error('❌ Error interno:', error);
        res.status(500).json({ 
            error: 'Error al generar audio',
            details: error.message 
        });
    }
});

// ==================== RUTA DE PRUEBA ====================
app.get('/', (req, res) => {
    res.json({
        nombre: 'MiAudioFiel',
        estado: '✅ Servidor activo',
        version: '1.0.0',
        mensaje: 'Usa POST /tts con JSON: { "text": "hola", "lang": "es", "speed": 1.0 }',
        limites: {
            maxCaracteres: MAX_CHARS,
            idiomas: ['es', 'ru', 'en'],
            velocidad: '0.5 - 2.0'
        }
    });
});

// ==================== INICIO DEL SERVIDOR ====================
app.listen(PORT, () => {
    console.log('=================================');
    console.log('🚀 MiAudioFiel - Servidor TTS');
    console.log('=================================');
    console.log(`📡 Puerto: ${PORT}`);
    console.log(`🌐 https://localhost:${PORT}`);
    console.log(`📢 POST /tts`);
    console.log(`✅ Límite: ${MAX_CHARS} caracteres`);
    console.log(`✅ Idiomas: español, ruso, inglés`);
    console.log('=================================');
});
