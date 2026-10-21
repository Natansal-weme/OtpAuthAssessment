import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router';
import { api, ApiError, errorMessage } from '../api';
import { setCurrentUser, setPendingSignIn } from '../auth';
import { AuthLayout } from '../components/AuthLayout';
import { paths } from '../paths';
import type { LoginNotice } from './LoginPage';

/** "/register" - Step 3 (new users only): profile details. */
export function RegisterPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<{ name?: string; email?: string; form?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const missing = {
      name: name.trim() ? undefined : 'Enter your name',
      email: email.trim() ? undefined : 'Enter your email',
    };
    if (missing.name || missing.email) return setErrors(missing);

    setSubmitting(true);
    setErrors({});
    try {
      const { user } = await api.completeRegistration({ name, email });
      setCurrentUser(user);
      setPendingSignIn(null);
      navigate(paths.home, { replace: true });
    } catch (err) {
      // The verification is gone (expired, used, or the phone got registered): start over.
      if (err instanceof ApiError && (err.status === 401 || err.status === 409)) {
        setPendingSignIn(null);
        navigate(paths.login, { replace: true, state: { notice: err.message } satisfies LoginNotice });
        return;
      }
      const fields = err instanceof ApiError ? err.fieldErrors : {};
      setErrors(
        fields.name || fields.email
          ? { name: fields.name, email: fields.email }
          : { form: errorMessage(err) },
      );
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      activeStep={2}
      title="Complete your profile"
      subtitle="Your phone number is verified. Tell us a bit about yourself to finish signing up."
    >
      <Stack component="form" spacing={2.5} noValidate onSubmit={handleSubmit}>
        <TextField
          name="name"
          label="Full name"
          autoComplete="name"
          autoFocus
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          error={Boolean(errors.name)}
          helperText={errors.name}
        />
        <TextField
          name="email"
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={Boolean(errors.email || errors.form)}
          helperText={errors.email ?? errors.form}
        />

        <Button type="submit" variant="contained" size="large" loading={submitting}>
          Complete registration
        </Button>
      </Stack>
    </AuthLayout>
  );
}
