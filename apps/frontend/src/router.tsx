import { createBrowserRouter, Navigate } from 'react-router';
import { SessionGuard } from './components/SessionGuard';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { VerifyPage } from './pages/VerifyPage';
import { paths } from './paths';

/**
 * Application routes, grouped by the session state allowed to see them:
 *
 *   /          -> LoginPage     (phone number)          anonymous | pending registration
 *   /verify    -> VerifyPage    (one-time code)         anonymous | pending registration
 *   /register  -> RegisterPage  (name + email)          pending registration only
 *   /home      -> HomePage      (logged in)             authenticated only
 *
 * A pending registration may restart from `/` (e.g. to use a different number).
 */
export const router = createBrowserRouter([
  {
    element: <SessionGuard allow={['anonymous', 'pending_registration']} />,
    children: [
      { path: paths.login, element: <LoginPage /> },
      { path: paths.verify, element: <VerifyPage /> },
    ],
  },
  {
    element: <SessionGuard allow={['pending_registration']} />,
    children: [{ path: paths.register, element: <RegisterPage /> }],
  },
  {
    element: <SessionGuard allow={['authenticated']} />,
    children: [{ path: paths.home, element: <HomePage /> }],
  },
  { path: '*', element: <Navigate to={paths.login} replace /> },
]);
