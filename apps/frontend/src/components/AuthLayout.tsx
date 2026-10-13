import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Stepper from '@mui/material/Stepper';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

const STEPS = ['Phone', 'Verify', 'Profile'] as const;

interface AuthLayoutProps {
  title: string;
  subtitle?: ReactNode;
  /** Index into `STEPS`, highlights the current step of the flow. */
  activeStep: number;
  children: ReactNode;
}

/** Centered card shared by all auth screens. Purely presentational. */
export function AuthLayout({ title, subtitle, activeStep, children }: AuthLayoutProps) {
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', py: 4 }}>
      <Container maxWidth="xs">
        <Paper variant="outlined" sx={{ p: { xs: 3, sm: 4 } }}>
          <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
            {STEPS.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          <Typography variant="h5" component="h1" gutterBottom sx={{ fontWeight: 700 }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {subtitle}
            </Typography>
          )}

          {children}
        </Paper>
      </Container>
    </Box>
  );
}
