// ════════════════════════════════════════════════════════════════
// DharmaSetu — Unified Backend Configuration
// FILE: dharmasetu-app/utils/backend-config.js
// PURPOSE: Single source of truth for backend URL and settings
//
// PHASE 1 FIX: Consolidate hardcoded BACKEND_URL from 6+ files
// to prevent configuration drift and enable easy env switching
// ════════════════════════════════════════════════════════════════

/**
 * Centralized backend configuration
 * 
 * Environment variables (takes precedence):
 * - EXPO_PUBLIC_BACKEND_URL: Backend base URL
 * - EXPO_PUBLIC_BACKEND_TIMEOUT: Request timeout in milliseconds
 * 
 * Fallbacks if env vars not set:
 * - URL: https://dharmasetu-backend-2c65.onrender.com (Render production)
 * - Timeout: 35000ms (35 seconds, accounts for Render hibernation wake-up)
 */
export const BACKEND_CONFIG = {
  // Base URL for all backend API calls
  // Set via: EXPO_PUBLIC_BACKEND_URL environment variable
  URL: process.env.EXPO_PUBLIC_BACKEND_URL || 'https://dharmasetu-backend-2c65.onrender.com',

  // Request timeout in milliseconds
  // Set via: EXPO_PUBLIC_BACKEND_TIMEOUT environment variable
  // Default 35s: 30s for Render app wake-up + 5s for network latency
  TIMEOUT: parseInt(process.env.EXPO_PUBLIC_BACKEND_TIMEOUT || '35000', 10),

  // API endpoints (relative paths)
  ENDPOINTS: {
    CONFIG: '/config',
    HEALTH: '/health',
    AI_CHAT: '/ai/chat',
    AI_DHARMA_CHAT: '/ai/dharma-chat',
    AI_RECOMMEND: '/ai/recommend',
    DHARMIC_INSIGHT: '/api/dharmic-insight',
    USERS_REGISTER: '/users/register',
    USERS_ACTIVITY: '/users/activity',
    USERS_ACCESS: '/users/access',
    USERS_UPDATE: '/users/update',
    USERS_DELETE: '/users/delete',
    USER_GET: '/user/get',
    FEEDBACK: '/feedback',
    PAYMENT_CONFIG: '/payment/config',
    PAYMENT_UPI_CREATE: '/payment/upi/create',
    PAYMENT_CONFIRM: '/payment/confirm',
    PANCHANG_TODAY: '/api/panchang/today',
    PANCHANG_DAY: '/api/panchang/day',
    PANCHANG_MONTH: '/api/panchang/month',
    PANCHANG_YEAR: '/api/panchang/year',
  },
};

/**
 * Get full backend URL for a given path
 * 
 * @param {string} path - API path (e.g., '/config', '/ai/dharma-chat')
 * @returns {string} Full URL (e.g., 'https://dharmasetu-backend-2c65.onrender.com/config')
 * 
 * @example
 * const configUrl = getBackendUrl(BACKEND_CONFIG.ENDPOINTS.CONFIG);
 * // Returns: 'https://dharmasetu-backend-2c65.onrender.com/config'
 */
export const getBackendUrl = (path = '') => {
  return `${BACKEND_CONFIG.URL}${path}`;
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Fetch from backend with standard timeout and error handling
 * 
 * @param {string} path - API path
 * @param {Object} options - Fetch options (method, headers, body, etc)
 * @returns {Promise<Response>} - Fetch response (caller must handle parsing)
 * 
 * @throws {Error} - Network error, timeout, or other fetch failures
 * 
 * @example
 * const res = await backendFetch('/config');
 * const data = await res.json();
 */
export async function backendFetch(path = '', options = {}) {
  const url = getBackendUrl(path);
  const timeout = options.timeout || BACKEND_CONFIG.TIMEOUT;
  const retries = Number.isFinite(options.retries) ? options.retries : 0;
  const retryDelay = options.retryDelay || 1500;
  const fetchOptions = { ...options };
  delete fetchOptions.timeout;
  delete fetchOptions.retries;
  delete fetchOptions.retryDelay;

  let lastError;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const startedAt = Date.now();
    try {
      const response = await new Promise((resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error(`Timeout after ${timeout}ms`)),
          timeout
        );

        fetch(url, fetchOptions)
          .then(r => {
            clearTimeout(timer);
            resolve(r);
          })
          .catch(e => {
            clearTimeout(timer);
            reject(e);
          });
      });

      console.log('[DharmaSetu] Backend response', {
        path,
        status: response.status,
        attempt: attempt + 1,
        elapsedMs: Date.now() - startedAt,
      });
      return response;
    } catch (e) {
      lastError = e;
      console.warn('[DharmaSetu] Backend request failed', {
        path,
        attempt: attempt + 1,
        retries,
        elapsedMs: Date.now() - startedAt,
        error: e.message,
      });

      if (attempt < retries) await sleep(retryDelay * (attempt + 1));
    }
  }

  throw lastError;
}

/**
 * Log backend configuration (for debugging)
 */
export function logBackendConfig() {
  console.log('[DharmaSetu] Backend Configuration:', {
    url: BACKEND_CONFIG.URL,
    timeout: `${BACKEND_CONFIG.TIMEOUT}ms`,
    environment: process.env.EXPO_PUBLIC_BACKEND_URL ? 'custom' : 'default',
  });
}
