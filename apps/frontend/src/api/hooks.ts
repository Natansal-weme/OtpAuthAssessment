/**
 * React Query hooks for the auth endpoints (`AuthController` in the backend).
 *
 * Request / response types come from the backend contract (`apps/backend/src/auth/auth.types.ts`),
 * so both sides always agree on the API shape. The `mutationFn` bodies are stubs that reject with
 * a "not implemented" error.
 *
 * TODO: Candidate to implement - the `mutationFn` bodies below.
 */
import { useMutation } from '@tanstack/react-query';
import type {
  CompleteRegistrationDto,
  CompleteRegistrationResponse,
  RequestOtpDto,
  RequestOtpResponse,
  VerifyOtpDto,
  VerifyOtpResponse,
} from '@backend/auth/auth.types';

/** Endpoint paths, relative to the `http` client's `/api` base URL. */
export const AUTH_ENDPOINTS = {
  requestOtp: '/auth/request-otp',
  verifyOtp: '/auth/verify-otp',
  completeRegistration: '/auth/complete-registration',
} as const;

export type RequestOtpInput = RequestOtpDto;
export type RequestOtpResult = RequestOtpResponse;

export type VerifyOtpInput = VerifyOtpDto;
export type VerifyOtpResult = VerifyOtpResponse;

export type CompleteRegistrationInput = CompleteRegistrationDto;
export type CompleteRegistrationResult = CompleteRegistrationResponse;

export const authMutationKeys = {
  requestOtp: ['auth', 'requestOtp'],
  verifyOtp: ['auth', 'verifyOtp'],
  completeRegistration: ['auth', 'completeRegistration'],
} as const;

function notImplemented(hook: string, endpoint: string): Error {
  return new Error(`${hook}: mutationFn is not implemented yet (POST /api${endpoint}, see src/api/hooks.ts)`);
}

/** Step 1 - `POST /api/auth/request-otp` */
export function useRequestOtp() {
  return useMutation<RequestOtpResult, Error, RequestOtpInput>({
    mutationKey: authMutationKeys.requestOtp,
    mutationFn: async (input) => {
      // TODO: Candidate to implement
      throw notImplemented('useRequestOtp', AUTH_ENDPOINTS.requestOtp);
    },
  });
}

/** Step 2 - `POST /api/auth/verify-otp` */
export function useVerifyOtp() {
  return useMutation<VerifyOtpResult, Error, VerifyOtpInput>({
    mutationKey: authMutationKeys.verifyOtp,
    mutationFn: async (input) => {
      // TODO: Candidate to implement
      throw notImplemented('useVerifyOtp', AUTH_ENDPOINTS.verifyOtp);
    },
  });
}

/** Step 3 (new users) - `POST /api/auth/complete-registration` */
export function useCompleteRegistration() {
  return useMutation<CompleteRegistrationResult, Error, CompleteRegistrationInput>({
    mutationKey: authMutationKeys.completeRegistration,
    mutationFn: async (input) => {
      // TODO: Candidate to implement
      throw notImplemented('useCompleteRegistration', AUTH_ENDPOINTS.completeRegistration);
    },
  });
}
