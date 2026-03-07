// ==================== APP PRINCIPAL ====================
import { generarAudio } from './modo-pro.js';
import { generarAudioRapido } from './modo-rapido.js';
import { formatNumber, updateCharCount, updatePlanBadge, saveToken, getToken } from './utils.js';

// ==================== CONSTANTES ====================
const DAILY_LIMIT = 2500;
const PLAN = 'GRATIS';

// ==================== ELEMENTOS DEL DOM ====================
const textInput = document.getElementById('textInput');
const charCountSpan = document.getElementById('charCount');
const charLimitSpan = document.getElementById('charLimit');
const playBtn = document.getElementById('playBtn');
const tokenBtn = document.getElementById('tokenBtn');
const upgradeBtn = document.getElementById('upgradeBtn');
const statusDiv = document.getElementById('status');
const voiceSelect = document.getElementById('voiceSelect');
const speedRadios = document.querySelectorAll('input[name="speed"]');
const audioPlayerCard = document.getElementById('audioPlayer');
const audioPlayerEl = document.getElementById('audioPlayerEl');
const downloadBtn = document.getElementById('downloadBtn');
const planBadge = document.getElementById('planBadge');

// ==================== ESTADO ====================
let currentAudioBlob = null;
let userToken = getToken();

// ==================== INICIALIZACIÓN ====================
function init() {
  console.log('🚀 Iniciando MiAudioFiel...');
  
  if (charLimitSpan) {
    charLimitSpan.textContent = `${formatNumber(DAILY_LIMIT)} / día`;
  }
  
  textInput.addEventListener('input', handleTextInput);
  playBtn.addEventListener('click', handlePlay);
  tokenBtn.addEventListener('click', handleToken);
  upgradeBtn.addEventListener('click', handleUpgrade);
  downloadBtn.addEventListener('click', handleDownload);
  
  downloadBtn.disabled = true;
  
  if (userToken) {
    console.log('🔑 Token encontrado');
    updateStatus('Token PRO cargado', 'info');
  }
  
  console.log('✅ App lista');
}

// ==================== FUNCIONES ====================

function handleTextInput(e) {
  const count = e.target.value.length;
  document.getElementById('charCount').textContent = count;
  console.log('📝 Caracteres:', count);
}

async function handlePlay() {
  console.log('🟢 Botón PLAY presionado');
  
  const text = textInput.value.trim();
  
  if (!text) {
    updateStatus('❌ Escribe algo primero', 'error');
    return;
  }

  const charCount = text.length;
  if (charCount > DAILY_LIMIT && !userToken) {
    updateStatus(`❌ Límite diario (${formatNumber(DAILY_LIMIT)} caracteres). Usa token PRO.`, 'error');
    return;
  }

  const voice = voiceSelect.value;
  let speed = '0';
  speedRadios.forEach(radio => {
    if (radio.checked) speed = radio.value;
  });

  updateStatus('⏳ Generando audio premium...', 'loading');
  playBtn.disabled = true;

  try {
    console.log('📡 Enviando petición al backend...');
    const audioBlob = await generarAudio(text, voice, speed, userToken);
    
    if (!audioBlob || audioBlob.size === 0) {
      throw new Error('Audio vacío');
    }
    
    const audioUrl = URL.createObjectURL(audioBlob);
    audioPlayerEl.src = audioUrl;
    audioPlayerCard.style.display = 'block';
    currentAudioBlob = audioBlob;
    downloadBtn.disabled = false;
    
    updateStatus('✅ Audio listo. Puedes reproducir o descargar.', 'success');
  } catch (error) {
    console.error('❌ Error completo:', error);
    
    if (!navigator.onLine) {
      updateStatus('❌ Sin conexión a internet', 'error');
    } else {
      updateStatus(`❌ Error: ${error.message}`, 'error');
    }
  } finally {
    playBtn.disabled = false;
    console.log('🔓 Botón re-habilitado');
  }
}

function handleToken() {
  console.log('🔑 Botón TOKEN presionado');
  
  const token = prompt('Ingresa tu token PRO o de dueño:');
  if (token && token.trim() !== '') {
    saveToken(token.trim());
    userToken = token.trim();
    updateStatus('✅ Token guardado. Acceso premium activado.', 'success');
    console.log('✅ Token guardado:', token);
  } else {
    updateStatus('❌ Token inválido o vacío', 'error');
    console.log('❌ Token inválido');
  }
}

function handleUpgrade() {
  console.log('💎 Botón IR PRO presionado');
  window.open('https://t.me/miaudiofiel_bot', '_blank');
}

function handleDownload() {
  console.log('💾 Botón DESCARGAR presionado');
  
  if (!currentAudioBlob) {
    console.log('❌ No hay audio para descargar');
    return;
  }
  
  const url = URL.createObjectURL(currentAudioBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `MiAudioFiel-${Date.now()}.mp3`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  console.log('✅ Descarga iniciada');
}

// ==================== UI HELPERS ====================
function updateStatus(message, type = 'info') {
  if (!statusDiv) return;
  
  statusDiv.innerHTML = `<i class="fas ${getIcon(type)}"></i> ${message}`;
  statusDiv.className = 'status-liquid';
  if (type === 'loading') {
    statusDiv.classList.add('status-playing');
  } else {
    statusDiv.classList.remove('status-playing');
  }
  
  console.log(`[${type.toUpperCase()}] ${message}`);
}

function getIcon(type) {
  switch(type) {
    case 'error': return 'fa-exclamation-circle';
    case 'success': return 'fa-check-circle';
    case 'loading': return 'fa-circle-notch fa-spin';
    default: return 'fa-info-circle';
  }
}

// ==================== INICIAR ====================
document.addEventListener('DOMContentLoaded', init);

// ==================== LOGS DE VERIFICACIÓN ====================
console.log('✅ app.js cargado');