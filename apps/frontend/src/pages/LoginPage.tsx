import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { type FormEvent, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { api, ApiError, errorMessage } from '../api';
import { getPendingSignIn, setPendingSignIn } from '../auth';
import { AuthLayout } from '../components/AuthLayout';
import { paths } from '../paths';

/** Message passed by pages that send the user back here. */
export interface LoginNotice {
  notice?: string;
}

/** "/" - Step 1: phone number. */
export function LoginPage() {
  const navigate = useNavigate();
  const notice = (useLocation().state as LoginNotice | null)?.notice;
  const [phone, setPhone] = useState(() => getPendingSignIn()?.phone ?? '');
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!phone.trim()) return setError('Enter your phone number');

    setSubmitting(true);
    setError(undefined);
    try {
      const { resendAvailableAt } = await api.requestOtp(phone);
      setPendingSignIn({ phone, stage: 'verify', resendAvailableAt });
      navigate(paths.verify);
    } catch (err) {
      setError((err instanceof ApiError && err.fieldErrors.phone) || errorMessage(err));
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      activeStep={0}
      title="Sign in or create an account"
      subtitle="Enter your phone number and we'll text you a verification code."
    >
      <Stack component="form" spacing={2.5} noValidate onSubmit={handleSubmit}>
        {notice && <Alert severity="info">{notice}</Alert>}

        <TextField
          name="phone"
          label="Phone number"
          type="tel"
          placeholder="050-123-4567"
          autoComplete="tel"
          autoFocus
          required
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          error={Boolean(error)}
          helperText={error}
        />

        <Button type="submit" variant="contained" size="large" loading={submitting}>
          Send code
        </Button>
      </Stack>
    </AuthLayout>
  );
}
