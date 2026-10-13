import nodeFetch from 'node-fetch';
import fetchCookie from 'fetch-cookie';

const SERVER_URL = 'http://localhost:3000';
const ENDPOINTS = {
  CODE_ENDPOINT: `${SERVER_URL}/api/auth/request-otp`,
  VERIFY_ENDPOINT: `${SERVER_URL}/api/auth/verify-otp`,
  COMPLETE_REGISTRATION_ENDPOINT: `${SERVER_URL}/api/auth/complete-registration`,
};
const PHONE = '+123456789123';

const createPost = (fetch) => (url, body) =>
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

async function tryBruteForce(maxAttemptsPerSession) {
  const fetch = fetchCookie(nodeFetch);
  const post = createPost(fetch);

  const sendCodeRes = await post(ENDPOINTS.CODE_ENDPOINT, { phone: PHONE });
  if (!sendCodeRes.ok) {
    const errorText = await sendCodeRes.text();
    throw new Error(`HTTP ${sendCodeRes.status}: ${errorText}`);
  }

  let isVerified = false;

  // Fire requests concurrently to test for race conditions in your NestJS server
  const verificationAttempts = Array.from({ length: maxAttemptsPerSession }).map(() => {
    // Generate random 6-digit code
    const randomCode = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
    return post(ENDPOINTS.VERIFY_ENDPOINT, { phone: PHONE, code: randomCode });
  });

  const responses = await Promise.all(verificationAttempts);

  for (const res of responses) {
    if (res.ok) {
      isVerified = true;
      break;
    }
  }

  if (!isVerified) return false;

  const completeRes = await post(ENDPOINTS.COMPLETE_REGISTRATION_ENDPOINT, {
    phone: PHONE,
    name: 'Test User',
    email: 'test@example.com',
  });

  return completeRes.ok;
}

async function run() {
  const totalSessions = Number(process.argv[2]) || 1;

  for (let i = 0; i < totalSessions; i++) {
    const result = await tryBruteForce(5);
    if (result) {
      console.log(
        `Completed. ${i} successful bypasses out of ${totalSessions} sessions. (Each time we try, we make 5 verification attempts)`,
      );
      process.exit(0);
    }
  }

  console.log(`Failed to bypass after ${totalSessions} sessions. (Each time we try, we make 5 verification attempts)`);
}

run();
