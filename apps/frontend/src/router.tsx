import { createBrowserRouter, Navigate } from 'react-router';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { VerifyPage } from './pages/VerifyPage';
import { paths } from './paths';

/**
 * Application routes.
 *
 *   /          -> LoginPage     (phone number)
 *   /verify    -> VerifyPage    (one-time code)
 *   /register  -> RegisterPage  (name + email, new users only)
 *
 * TODO: Candidate to implement
 */
export const router = createBrowserRouter([
  { path: paths.login, element: <LoginPage /> },
  { path: paths.verify, element: <VerifyPage /> },
  { path: paths.register, element: <RegisterPage /> },
  { path: '*', element: <Navigate to={paths.login} replace /> },
]);
