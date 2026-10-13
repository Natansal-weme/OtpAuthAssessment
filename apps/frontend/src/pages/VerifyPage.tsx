import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { AuthLayout } from '../components/AuthLayout';

/**
 * "/verify" - Step 2: one-time code.
 *
 * TODO: Candidate to implement
 */
export function VerifyPage() {
  return (
    <AuthLayout
      activeStep={1}
      title="Enter verification code"
      subtitle="We sent a code to your phone."
    >
      <Stack component="form" spacing={2.5} noValidate>
        <TextField
          name="code"
          label="Verification code"
          autoComplete="one-time-code"
          autoFocus
          required
          slotProps={{
            htmlInput: {
              inputMode: 'numeric',
              style: { letterSpacing: '0.5em', textAlign: 'center', fontSize: '1.25rem' },
            },
          }}
        />

        <Button type="submit" variant="contained" size="large">
          Verify
        </Button>

        <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
          <Button type="button" variant="text" size="small">
            Use a different number
          </Button>
          <Button type="button" variant="text" size="small">
            Resend code
          </Button>
        </Stack>
      </Stack>
    </AuthLayout>
  );
}
