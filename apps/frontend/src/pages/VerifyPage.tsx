import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { type FormEvent, useEffect, useState } from 'react';
import { useLoaderData, useNavigate } from 'react-router';
import { api, ApiError, errorMessage } from '../api';
import { setCurrentUser, setPendingSignIn } from '../auth';
import { AuthLayout } from '../components/AuthLayout';
import type { verifyLoader } from '../loaders';
import { paths } from '../paths';

/** "/verify" - Step 2: one-time code. */
export function VerifyPage() {
  const pending = useLoaderData<typeof verifyLoader>();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string>();
  const [info, setInfo] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendAt, setResendAt] = useState(() => Date.parse(pending.resendAvailableAt ?? '') || 0);
  const resendIn = useSecondsUntil(resendAt);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (code.length !== 6) return setError('Enter the 6-digit code');

    setSubmitting(true);
    setError(undefined);
    setInfo(undefined);
    try {
      const result = await api.verifyOtp(pending.phone, code);
      if (result.status === 'authenticated') {
        setCurrentUser(result.user);
        setPendingSignIn(null);
        navigate(paths.home, { replace: true });
      } else {
        setPendingSignIn({ ...pending, stage: 'register' });
        navigate(paths.register, { replace: true });
      }
    } catch (err) {
      setError(verifyErrorMessage(err));
      setCode('');
      setSubmitting(false);
    }
  }

  async function handleResend() {
    setResending(true);
    setError(undefined);
    setInfo(undefined);
    try {
      const { resendAvailableAt } = await api.requestOtp(pending.phone);
      setPendingSignIn({ ...pending, resendAvailableAt });
      setResendAt(Date.parse(resendAvailableAt));
      setCode('');
      setInfo('We sent you a new code.');
    } catch (err) {
      const wait = err instanceof ApiError ? err.body.retryAfterSeconds : undefined;
      if (wait) setResendAt(Date.now() + wait * 1000);
      setError(errorMessage(err));
    } finally {
      setResending(false);
    }
  }

  function handleChangeNumber() {
    setPendingSignIn(null);
    navigate(paths.login, { replace: true });
  }

  return (
    <AuthLayout
      activeStep={1}
      title="Enter verification code"
      subtitle={`We sent a code to ${pending.phone}.`}
    >
      <Stack component="form" spacing={2.5} noValidate onSubmit={handleSubmit}>
        {info && <Alert severity="success">{info}</Alert>}

        <TextField
          name="code"
          label="Verification code"
          autoComplete="one-time-code"
          autoFocus
          required
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
          error={Boolean(error)}
          helperText={error}
          slotProps={{
            htmlInput: {
              inputMode: 'numeric',
              maxLength: 6,
              sx: { letterSpacing: '0.5em', textAlign: 'center', fontSize: '1.25rem' },
            },
          }}
        />

        <Button type="submit" variant="contained" size="large" loading={submitting}>
          Verify
        </Button>

        <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
          <Button type="button" variant="text" size="small" onClick={handleChangeNumber}>
            Use a different number
          </Button>
          <Button
            type="button"
            variant="text"
            size="small"
            onClick={handleResend}
            loading={resending}
            disabled={resendIn > 0}
          >
            {resendIn > 0 ? `Resend code (${resendIn}s)` : 'Resend code'}
          </Button>
        </Stack>
      </Stack>
    </AuthLayout>
  );
}

function verifyErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.reason === 'invalid_code') {
    const left = error.body.attemptsRemaining ?? 0;
    return left > 0
      ? `Incorrect code. ${left} attempt${left === 1 ? '' : 's'} left.`
      : 'Incorrect code. No attempts left: request a new code.';
  }
  return errorMessage(error);
}

/** Whole seconds until `timestamp`, ticking every second. */
function useSecondsUntil(timestamp: number): number {
  const [now, setNow] = useState(() => Date.now());
  const remaining = Math.max(0, Math.ceil((timestamp - now) / 1000));

  const done = remaining === 0;

  useEffect(() => {
    if (done) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [done]);

  return remaining;
}
