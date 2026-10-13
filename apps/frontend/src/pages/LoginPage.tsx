import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { AuthLayout } from '../components/AuthLayout';

/**
 * "/" - Step 1: phone number.
 *
 * TODO: Candidate to implement
 */
export function LoginPage() {
  return (
    <AuthLayout
      activeStep={0}
      title="Sign in or create an account"
      subtitle="Enter your phone number and we'll text you a verification code."
    >
      <Stack component="form" spacing={2.5} noValidate>
        <TextField
          name="phone"
          label="Phone number"
          type="tel"
          placeholder="+1 555 123 4567"
          autoComplete="tel"
          autoFocus
          required
        />

        <Button type="submit" variant="contained" size="large">
          Send code
        </Button>
      </Stack>
    </AuthLayout>
  );
}
