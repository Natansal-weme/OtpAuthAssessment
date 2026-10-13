import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { getErrorMessage } from '../api/errors';
import { useRequestOtp, useVerifyOtp } from '../api/hooks';
import { AuthLayout } from '../components/AuthLayout';
import { useCountdown } from '../hooks/useCountdown';
import { paths } from '../paths';
import type { LoginLocationState } from './LoginPage';

const CODE_LENGTH = 6;

/**
 * Router state handed over by `LoginPage`. The phone is not a secret: the server independently
 * checks that a code was issued for it, so tampering with this state gains nothing.
 */
export interface VerifyLocationState {
  phone: string;
  resendAvailableInSeconds: number;
}

/** "/verify" - Step 2: one-time code. */
export function VerifyPage() {
  const state = useLocation().state as Partial<VerifyLocationState> | null;

  if (!state?.phone) return <Navigate to={paths.login} replace />;

  return <VerifyForm phone={state.phone} resendAvailableInSeconds={state.resendAvailableInSeconds ?? 0} />;
}

function VerifyForm({ phone, resendAvailableInSeconds }: VerifyLocationState) {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [notice, setNotice] = useState<string>();
  const verifyOtp = useVerifyOtp();
  const requestOtp = useRequestOtp();
  const cooldown = useCountdown(resendAvailableInSeconds);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (code.length !== CODE_LENGTH || verifyOtp.isPending) return;

    setNotice(undefined);
    verifyOtp.mutate(
      { phone, code },
      {
        onSuccess: (result) => {
          navigate(result.status === 'authenticated' ? paths.home : paths.register, { replace: true });
        },
        onError: () => setCode(''),
      },
    );
  };

  const handleResend = () => {
    verifyOtp.reset();
    setNotice(undefined);
    requestOtp.mutate(
      { phone },
      {
        onSuccess: (result) => {
          cooldown.restart(result.resendAvailableInSeconds);
          setCode('');
          setNotice('A new code is on its way.');
        },
      },
    );
  };

  const handleChangeNumber = () => {
    const state: LoginLocationState = { phone };
    navigate(paths.login, { state });
  };

  const error = verifyOtp.error ?? requestOtp.error;

  return (
    <AuthLayout activeStep={1} title="Enter verification code" subtitle={`We sent a code to ${phone}.`}>
      <Stack component="form" spacing={2.5} noValidate onSubmit={handleSubmit}>
        {error && <Alert severity="error">{getErrorMessage(error)}</Alert>}
        {notice && <Alert severity="success">{notice}</Alert>}

        <TextField
          name="code"
          label="Verification code"
          autoComplete="one-time-code"
          autoFocus
          required
          value={code}
          onChange={(event) => {
            setCode(event.target.value.replace(/\D/g, '').slice(0, CODE_LENGTH));
            if (verifyOtp.isError) verifyOtp.reset();
          }}
          disabled={verifyOtp.isPending}
          slotProps={{
            htmlInput: {
              inputMode: 'numeric',
              maxLength: CODE_LENGTH,
              style: { letterSpacing: '0.5em', textAlign: 'center', fontSize: '1.25rem' },
            },
          }}
        />

        <Button
          type="submit"
          variant="contained"
          size="large"
          loading={verifyOtp.isPending}
          disabled={code.length !== CODE_LENGTH}
        >
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
            loading={requestOtp.isPending}
            disabled={cooldown.secondsLeft > 0}
          >
            {cooldown.secondsLeft > 0 ? `Resend code (${cooldown.secondsLeft}s)` : 'Resend code'}
          </Button>
        </Stack>
      </Stack>
    </AuthLayout>
  );
}
