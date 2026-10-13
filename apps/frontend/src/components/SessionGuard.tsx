import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import { Navigate, Outlet } from 'react-router';
import { getErrorMessage } from '../api/errors';
import { useSession, type Session } from '../api/hooks';
import { paths } from '../paths';

type SessionStatus = Session['status'];

/** Where each auth state belongs when it lands on a route it is not allowed on. */
const landingPage: Record<SessionStatus, string> = {
  anonymous: paths.login,
  pending_registration: paths.register,
  authenticated: paths.home,
};

interface SessionGuardProps {
  /** Session states allowed to see the nested routes. */
  allow: readonly SessionStatus[];
}

/**
 * Layout route that only renders its children for the allowed session states, and otherwise
 * redirects to the page matching the current state. The state comes from the server
 * (`GET /api/auth/session`), so the client cannot fake its way into a step.
 */
export function SessionGuard({ allow }: SessionGuardProps) {
  const { data: session, isPending, isError, error, refetch } = useSession();

  if (isPending) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <CircularProgress aria-label="Loading" />
      </Box>
    );
  }

  if (isError) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: 2 }}>
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => void refetch()}>
              Retry
            </Button>
          }
        >
          {getErrorMessage(error)}
        </Alert>
      </Box>
    );
  }

  if (!allow.includes(session.status)) {
    return <Navigate to={landingPage[session.status]} replace />;
  }

  return <Outlet />;
}
