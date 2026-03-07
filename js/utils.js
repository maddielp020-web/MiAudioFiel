// ==================== UTILIDADES ====================

/**
 * Formatea un número con separadores de miles (ej. 2500 → "2,500")
 * @param {number} num - Número a formatear
 * @returns {string} Número formateado
 */
export function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Actualiza el contador de caracteres en la UI
 * @param {string} text - Texto actual del textarea
 * @param {HTMLElement} charCountElement - Elemento donde mostrar el contador
 */
export function updateCharCount(text, charCountElement) {
  const count = text.length;
  charCountElement.textContent = formatNumber(count);
  return count;
}

/**
 * Actualiza el badge del plan y caracteres restantes
 * @param {string} plan - 'GRATIS', 'PRO', 'DUEÑO'
 * @param {number} charsUsed - Caracteres usados hoy
 * @param {number} dailyLimit - Límite diario (ej. 2500)
 * @param {HTMLElement} badgeElement - Elemento del badge
 */
export function updatePlanBadge(plan, charsUsed, dailyLimit, badgeElement) {
  const planSpan = badgeElement.querySelector('span:first-of-type');
  const charsSpan = badgeElement.querySelector('#charsLeft');
  
  if (planSpan) planSpan.textContent = `PLAN ${plan}`;
  if (charsSpan) {
    const remaining = dailyLimit - charsUsed;
    charsSpan.textContent = `${formatNumber(remaining)} / día`;
    
    // Cambiar color si está cerca del límite
    if (remaining < 500) {
      charsSpan.style.color = 'var(--warning)';
    } else {
      charsSpan.style.color = '';
    }
  }
}

/**
 * Guarda el token en localStorage
 * @param {string} token 
 */
export function saveToken(token) {
  if (token) {
    localStorage.setItem('miaudio_token', token);
  }
}

/**
 * Recupera el token de localStorage
 * @returns {string|null}
 */
export function getToken() {
  return localStorage.getItem('miaudio_token');
}

/**
 * Limpia el token
 */
export function clearToken() {
  localStorage.removeItem('miaudio_token');
}

// ==================== LOGS DE VERIFICACIÓN ====================
console.log('✅ utils.js cargado');
