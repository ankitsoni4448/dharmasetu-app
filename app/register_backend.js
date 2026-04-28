// ════════════════════════════════════════════════════════════════
// DharmaSetu — register_backend.js
//
// EXACT FILE LOCATION:
//   D:\DharmaSetu\dharmasetu-app\app\register_backend.js
//
// ── HOW TO ADD TO login.js ─────────────────────────────────────
// Step 1: Open D:\DharmaSetu\dharmasetu-app\app\login.js
// Step 2: Add this import at the very top of the file (line 1-5 area):
//
//   import { registerUserToBackend } from './register_backend';
//
// Step 3: Find the function called verifyAndSave()
//         After this line:
//           await AsyncStorage.setItem('dharmasetu_user', JSON.stringify(userData));
//         Add this line immediately after:
//           registerUserToBackend(userData);
//
// ── HOW TO ADD FEEDBACK TO explore.js ─────────────────────────
// In explore.js, find the storeFb function and add this after it:
//
//   import { submitFeedback } from './register_backend';
//
// Then in storeFb(), add:
//   submitFeedback(q, a, rating, reason, user?.phone || '');
// ════════════════════════════════════════════════════════════════

const BACKEND_URL = 'https://dharmasetu-backend-2c65.onrender.com';

/**
 * Call this after user completes login/signup in login.js
 * Non-blocking — if backend is offline, login still works normally
 */
export async function registerUserToBackend(userData) {
  if (!userData || !userData.phone) return;
  try {
    const body = {
      phone:       userData.phone      || '',
      name:        userData.name       || 'DharmaSetu User',
      email:       userData.email      || '',
      rashi:       userData.rashi      || 'Mesh',
      nakshatra:   userData.nakshatra  || 'Ashwini',
      deity:       userData.deity      || 'Hanuman',
      language:    userData.language   || 'hindi',
      birthCity:   userData.birthCity  || userData.birth_city || '',
      dob:         userData.dob        || '',
      firebaseUid: userData.firebaseUid || userData.firebase_uid || '',
      pushToken:   userData.pushToken  || '',
    };
    const res = await fetch(`${BACKEND_URL}/users/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (data.success) {
      console.log('[Backend] User synced:', data.isNew ? '✅ New user created' : '✅ Existing user updated');
    } else {
      console.log('[Backend] Register response:', data.error);
    }
  } catch (err) {
    // Silent fail — never break login
    console.log('[Backend] Register skipped (offline):', err.message);
  }
}

/**
 * Track user activity — call from DharmaChat, Home, etc.
 * @param {string} phone - user phone number
 * @param {string} type  - 'question' | 'checkin' | 'factcheck' | 'katha'
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
 * Submit feedback when user taps 👎 in DharmaChat
 * Call this from explore.js storeFb() function
 *
 * @param {string} question    - The question that was asked
 * @param {string} wrongAnswer - The AI answer
 * @param {string} rating      - 'up' or 'down'
 * @param {string} reason      - Why it's wrong
 * @param {string} phone       - User's phone number
 */
export async function submitFeedback(question, wrongAnswer, rating, reason, phone) {
  // Only send feedback for thumbs down
  if (rating !== 'down') return;
  try {
    const res = await fetch(`${BACKEND_URL}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question:    question    || '',
        wrongAnswer: wrongAnswer || '',
        reason:      reason      || '',
        phone:       phone       || '',
        rating:      rating      || 'down',
      }),
    });
    const data = await res.json();
    if (data.success) {
      console.log('[Backend] Feedback saved to Supabase:', data.id);
    }
  } catch (err) {
    console.log('[Backend] Feedback submit skipped:', err.message);
  }
}