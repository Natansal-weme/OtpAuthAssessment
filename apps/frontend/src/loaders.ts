import { redirect } from 'react-router';
import { getCurrentUser, getPendingSignIn } from './auth';
import { paths } from './paths';

/** Route guards. They run before a page renders, so a guarded page never flashes. */

async function redirectSignedIn(): Promise<void> {
  if (await getCurrentUser()) throw redirect(paths.home);
}

export async function loginLoader() {
  await redirectSignedIn();
  return null;
}

/** Sends the user to the step of the flow they are actually at. */
function pendingAt(stage: 'verify' | 'register') {
  const pending = getPendingSignIn();
  if (!pending) throw redirect(paths.login);
  if (pending.stage !== stage) throw redirect(paths[pending.stage]);
  return pending;
}

export async function verifyLoader() {
  await redirectSignedIn();
  return pendingAt('verify');
}

export async function registerLoader() {
  await redirectSignedIn();
  return pendingAt('register');
}

export async function homeLoader() {
  const user = await getCurrentUser();
  if (!user) throw redirect(paths.login);
  return user;
}
