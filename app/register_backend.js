// ════════════════════════════════════════════════════════════════
// DharmaSetu — Register Backend
//
// FILE LOCATION: D:\DharmaSetu\dharmasetu-app\app\register_backend.js
//
// HOW TO USE IN login.js:
// Step 1: Add this import at the TOP of login.js:
//   import { registerUserToBackend, trackActivity } from './register_backend';
//
// Step 2: Inside your verifyAndSave() function, AFTER the line:
//   await AsyncStorage.setItem('dharmasetu_user', JSON.stringify(userData));
// ADD this line:
//   registerUserToBackend(userData); // non-blocking - won't break login if offline
//
// That's it! This file handles everything else automatically.
// ════════════════════════════════════════════════════════════════

const BACKEND_URL = 'https://dharmasetu-backend-2c65.onrender.com';

/**
 * Call this after user completes login/signup.
 * Non-blocking — if backend is offline, login still works normally.
 *
 * @param {Object} userData - The user object saved to AsyncStorage
 * Example userData shape:
 * {
 *   phone: '9876543210',
 *   name: 'Ankit Soni',
 *   rashi: 'Mesh',
 *   nakshatra: 'Ashwini',
 *   deity: 'Hanuman',
 *   language: 'hindi',
 *   birthCity: 'Indore',
 *   dob: '1990-01-15',
 *   plan: 'free',
 * }
 */
export async function registerUserToBackend(userData) {
  try {
    const response = await fetch(`${BACKEND_URL}/users/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone:     userData.phone      || '',
        name:      userData.name       || '',
        rashi:     userData.rashi      || 'Mesh',
        nakshatra: userData.nakshatra  || 'Ashwini',
        deity:     userData.deity      || 'Hanuman',
        language:  userData.language   || 'hindi',
        birthCity: userData.birthCity  || '',
        dob:       userData.dob        || '',
      }),
    });
    const data = await response.json();
    if (data.success) {
      console.log('[Backend] User registered:', data.isNew ? 'NEW USER' : 'returning user');
    }
  } catch (error) {
    // Silent fail — login works even if backend is offline
    console.log('[Backend] Registration skipped (offline):', error.message);
  }
}

/**
 * Track user activity — call anywhere in the app.
 * Types: 'question', 'checkin', 'factcheck', 'katha'
 *
 * @param {string} phone - User's phone number
 * @param {string} type  - Activity type
 */
export async function trackActivity(phone, type = 'checkin') {
  if (!phone) return;
  try {
    await fetch(`${BACKEND_URL}/users/activity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, type }),
    });
  } catch {
    // Silent fail
  }
}

/**
 * Submit feedback about a wrong AI answer.
 * Call this when user taps 👎 in DharmaChat.
 *
 * @param {string} question       - The question that was asked
 * @param {string} wrongAnswer    - The AI answer that was wrong
 * @param {string} reason         - Why it's wrong (optional)
 * @param {string} phone          - User's phone (optional)
 */
export async function submitFeedback(question, wrongAnswer, reason = '', phone = '') {
  try {
    await fetch(`${BACKEND_URL}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, wrongAnswer, reason, phone }),
    });
  } catch {
    // Silent fail
  }
}