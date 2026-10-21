import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { useLoaderData, useNavigate } from 'react-router';
import { api, errorMessage } from '../api';
import { formatPhone, setCurrentUser } from '../auth';
import { AuthLayout } from '../components/AuthLayout';
import type { homeLoader } from '../loaders';
import { paths } from '../paths';

/** "/home" - signed-in users only. */
export function HomePage() {
  const user = useLoaderData<typeof homeLoader>();
  const navigate = useNavigate();
  const [error, setError] = useState<string>();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    setError(undefined);
    try {
      await api.logout();
      setCurrentUser(null);
      navigate(paths.login, { replace: true });
    } catch (err) {
      setError(errorMessage(err));
      setSigningOut(false);
    }
  }

  return (
    <AuthLayout activeStep={3} title={`Welcome, ${user.name}`} subtitle="You're signed in.">
      <Stack spacing={2.5}>
        <Stack spacing={0.5}>
          <Typography variant="body2" color="text.secondary">
            Phone
          </Typography>
          <Typography>{formatPhone(user.phone)}</Typography>
        </Stack>
        <Stack spacing={0.5}>
          <Typography variant="body2" color="text.secondary">
            Email
          </Typography>
          <Typography>{user.email}</Typography>
        </Stack>

        {error && <Alert severity="error">{error}</Alert>}

        <Button variant="outlined" size="large" onClick={handleSignOut} loading={signingOut}>
          Sign out
        </Button>
      </Stack>
    </AuthLayout>
  );
}
