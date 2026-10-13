import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { getErrorMessage } from '../api/errors';
import { useRequestOtp } from '../api/hooks';
import { AuthLayout } from '../components/AuthLayout';
import { paths } from '../paths';
import type { VerifyLocationState } from './VerifyPage';

/** Optional router state, used by "Use a different number" to prefill the field. */
export interface LoginLocationState {
  phone?: string;
}

/** "/" - Step 1: phone number. */
export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [phone, setPhone] = useState((location.state as LoginLocationState | null)?.phone ?? '');
  const requestOtp = useRequestOtp();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!phone.trim() || requestOtp.isPending) return;

    requestOtp.mutate(
      { phone },
      {
        onSuccess: (result) => {
          const state: VerifyLocationState = {
            phone: result.phone,
            resendAvailableInSeconds: result.resendAvailableInSeconds,
          };
          navigate(paths.verify, { state });
        },
      },
    );
  };

  return (
    <AuthLayout
      activeStep={0}
      title="Sign in or create an account"
      subtitle="Enter your phone number and we'll text you a verification code."
    >
      <Stack component="form" spacing={2.5} noValidate onSubmit={handleSubmit}>
        {requestOtp.isError && <Alert severity="error">{getErrorMessage(requestOtp.error)}</Alert>}

        <TextField
          name="phone"
          label="Phone number"
          type="tel"
          placeholder="+1 555 123 4567"
          helperText="International format, including the country code"
          autoComplete="tel"
          autoFocus
          required
          value={phone}
          onChange={(event) => {
            setPhone(event.target.value);
            if (requestOtp.isError) requestOtp.reset();
          }}
          error={requestOtp.isError}
          disabled={requestOtp.isPending}
        />

        <Button
          type="submit"
          variant="contained"
          size="large"
          loading={requestOtp.isPending}
          disabled={!phone.trim()}
        >
          Send code
        </Button>
      </Stack>
    </AuthLayout>
  );
}
