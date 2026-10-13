import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { getErrorMessage } from '../api/errors';
import { useLogout, useSession } from '../api/hooks';
import { AuthLayout } from '../components/AuthLayout';

/** "/home" - Logged in. Only reachable in the `authenticated` state (see `SessionGuard`). */
export function HomePage() {
  const { data: session } = useSession();
  const logout = useLogout();

  if (session?.status !== 'authenticated') return null;
  const { user } = session;

  const details = [
    { label: 'Name', value: user.name },
    { label: 'Email', value: user.email },
    { label: 'Phone', value: user.phone },
    { label: 'Member since', value: new Date(user.createdAt).toLocaleDateString() },
  ];

  return (
    <AuthLayout activeStep={3} title={`Welcome, ${user.name}`} subtitle="You're signed in.">
      <Stack spacing={2.5}>
        <Stack component="dl" spacing={1.5} sx={{ m: 0 }}>
          {details.map(({ label, value }) => (
            <div key={label}>
              <Typography component="dt" variant="caption" color="text.secondary">
                {label}
              </Typography>
              <Typography component="dd" sx={{ m: 0 }}>
                {value}
              </Typography>
            </div>
          ))}
        </Stack>

        {logout.isError && <Alert severity="error">{getErrorMessage(logout.error)}</Alert>}

        <Button variant="outlined" size="large" loading={logout.isPending} onClick={() => logout.mutate()}>
          Log out
        </Button>
      </Stack>
    </AuthLayout>
  );
}
