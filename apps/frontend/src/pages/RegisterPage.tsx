import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { AuthLayout } from '../components/AuthLayout';

/**
 * "/register" - Step 3 (new users only): profile details.
 *
 * TODO: Candidate to implement
 */
export function RegisterPage() {
  return (
    <AuthLayout
      activeStep={2}
      title="Complete your profile"
      subtitle="Your phone number is verified. Tell us a bit about yourself to finish signing up."
    >
      <Stack component="form" spacing={2.5} noValidate>
        <TextField name="name" label="Full name" autoComplete="name" autoFocus required />
        <TextField name="email" label="Email" type="email" autoComplete="email" required />

        <Button type="submit" variant="contained" size="large">
          Complete registration
        </Button>
      </Stack>
    </AuthLayout>
  );
}
