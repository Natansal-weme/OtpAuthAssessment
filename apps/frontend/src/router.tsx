import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import type { ReactNode } from 'react';
import { createBrowserRouter, Navigate, Outlet } from 'react-router';
import { homeLoader, loginLoader, registerLoader, verifyLoader } from './loaders';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { VerifyPage } from './pages/VerifyPage';
import { paths } from './paths';

/**
 * Application routes.
 *
 *   /          -> LoginPage     (phone number)            guests only
 *   /verify    -> VerifyPage    (one-time code)           guests with a pending code
 *   /register  -> RegisterPage  (name + email)            guests with a verified, unregistered phone
 *   /home      -> HomePage                                signed-in users only
 */
export const router = createBrowserRouter([
  {
    element: <Outlet />,
    hydrateFallbackElement: <Centered><CircularProgress /></Centered>,
    errorElement: <LoadError />,
    children: [
      { path: paths.login, loader: loginLoader, element: <LoginPage /> },
      { path: paths.verify, loader: verifyLoader, element: <VerifyPage /> },
      { path: paths.register, loader: registerLoader, element: <RegisterPage /> },
      { path: paths.home, loader: homeLoader, element: <HomePage /> },
      { path: '*', element: <Navigate to={paths.login} replace /> },
    ],
  },
]);

function Centered({ children }: { children: ReactNode }) {
  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: 2 }}>{children}</Box>
  );
}

/** Shown when a guard can't reach the server. */
function LoadError() {
  return (
    <Centered>
      <Alert
        severity="error"
        action={
          <Button color="inherit" size="small" onClick={() => window.location.reload()}>
            Retry
          </Button>
        }
      >
        Couldn't reach the server.
      </Alert>
    </Centered>
  );
}
