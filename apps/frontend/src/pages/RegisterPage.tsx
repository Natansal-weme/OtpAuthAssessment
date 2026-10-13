import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { getErrorMessage, getErrorStatus } from '../api/errors';
import { sessionQueryKey, useCompleteRegistration, useSession } from '../api/hooks';
import { AuthLayout } from '../components/AuthLayout';
import { paths } from '../paths';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * "/register" - Step 3 (new users only): profile details.
 *
 * Only reachable in the `pending_registration` state (see `SessionGuard`). The verified phone is
 * held server-side; this page only submits the profile.
 */
export function RegisterPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const completeRegistration = useCompleteRegistration();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const nameError = submitted && !name.trim() ? 'Name is required' : undefined;
  const emailError = submitted && !EMAIL_PATTERN.test(email.trim()) ? 'Enter a valid email address' : undefined;

  const verificationExpired = getErrorStatus(completeRegistration.error) === 401;
  const phone = session?.status === 'pending_registration' ? session.phone : undefined;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
    if (!name.trim() || !EMAIL_PATTERN.test(email.trim()) || completeRegistration.isPending) return;

    completeRegistration.mutate(
      { name, email },
      { onSuccess: () => navigate(paths.home, { replace: true }) },
    );
  };

  const handleStartOver = () => {
    void queryClient.invalidateQueries({ queryKey: sessionQueryKey });
    navigate(paths.login, { replace: true });
  };

  return (
    <AuthLayout
      activeStep={2}
      title="Complete your profile"
      subtitle={
        <>
          Your phone number{phone && <strong> {phone}</strong>} is verified. Tell us a bit about yourself
          to finish signing up.
        </>
      }
    >
      <Stack component="form" spacing={2.5} noValidate onSubmit={handleSubmit}>
        {completeRegistration.isError && (
          <Alert
            severity="error"
            action={
              verificationExpired && (
                <Button color="inherit" size="small" onClick={handleStartOver}>
                  Start over
                </Button>
              )
            }
          >
            {getErrorMessage(completeRegistration.error)}
          </Alert>
        )}

        <TextField
          name="name"
          label="Full name"
          autoComplete="name"
          autoFocus
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          error={Boolean(nameError)}
          helperText={nameError}
          disabled={completeRegistration.isPending}
          slotProps={{ htmlInput: { maxLength: 100 } }}
        />
        <TextField
          name="email"
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={Boolean(emailError)}
          helperText={emailError}
          disabled={completeRegistration.isPending}
        />

        <Button type="submit" variant="contained" size="large" loading={completeRegistration.isPending}>
          Complete registration
        </Button>
      </Stack>
    </AuthLayout>
  );
}
