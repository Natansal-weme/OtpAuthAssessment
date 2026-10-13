/**
 * React Query hooks for the auth endpoints (`AuthController` in the backend).
 *
 * Request / response types come from the backend contract (`apps/backend/src/auth/auth.types.ts`),
 * so both sides always agree on the API shape.
 *
 * Tokens live in `httpOnly` cookies that this code never sees. The server is the source of truth
 * for where the user stands in the flow, exposed through `useSession()`. Mutations write their
 * outcome into the session cache so the route guards react without an extra round trip.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CompleteRegistrationDto,
  CompleteRegistrationResponse,
  RequestOtpDto,
  RequestOtpResponse,
  SessionResponse,
  VerifyOtpDto,
  VerifyOtpResponse,
} from '@backend/auth/auth.types';
import { http } from './http';

/** Endpoint paths, relative to the `http` client's `/api` base URL. */
export const AUTH_ENDPOINTS = {
  requestOtp: '/auth/request-otp',
  verifyOtp: '/auth/verify-otp',
  completeRegistration: '/auth/complete-registration',
  session: '/auth/session',
  logout: '/auth/logout',
} as const;

export type RequestOtpInput = RequestOtpDto;
export type RequestOtpResult = RequestOtpResponse;

export type VerifyOtpInput = VerifyOtpDto;
export type VerifyOtpResult = VerifyOtpResponse;

export type CompleteRegistrationInput = CompleteRegistrationDto;
export type CompleteRegistrationResult = CompleteRegistrationResponse;

export type Session = SessionResponse;

export const authMutationKeys = {
  requestOtp: ['auth', 'requestOtp'],
  verifyOtp: ['auth', 'verifyOtp'],
  completeRegistration: ['auth', 'completeRegistration'],
  logout: ['auth', 'logout'],
} as const;

export const sessionQueryKey = ['auth', 'session'] as const;

/** Current auth state of this browser: anonymous, pending registration, or authenticated. */
export function useSession() {
  return useQuery<Session, Error>({
    queryKey: sessionQueryKey,
    queryFn: async () => (await http.get<Session>(AUTH_ENDPOINTS.session)).data,
  });
}

/** Step 1 - `POST /api/auth/request-otp` */
export function useRequestOtp() {
  return useMutation<RequestOtpResult, Error, RequestOtpInput>({
    mutationKey: authMutationKeys.requestOtp,
    mutationFn: async (input) => (await http.post<RequestOtpResult>(AUTH_ENDPOINTS.requestOtp, input)).data,
  });
}

/** Step 2 - `POST /api/auth/verify-otp` */
export function useVerifyOtp() {
  const queryClient = useQueryClient();
  return useMutation<VerifyOtpResult, Error, VerifyOtpInput>({
    mutationKey: authMutationKeys.verifyOtp,
    mutationFn: async (input) => (await http.post<VerifyOtpResult>(AUTH_ENDPOINTS.verifyOtp, input)).data,
    onSuccess: (result) => {
      const session: Session =
        result.status === 'authenticated'
          ? { status: 'authenticated', user: result.user }
          : { status: 'pending_registration', phone: result.phone };
      queryClient.setQueryData(sessionQueryKey, session);
    },
  });
}

/** Step 3 (new users) - `POST /api/auth/complete-registration` */
export function useCompleteRegistration() {
  const queryClient = useQueryClient();
  return useMutation<CompleteRegistrationResult, Error, CompleteRegistrationInput>({
    mutationKey: authMutationKeys.completeRegistration,
    mutationFn: async (input) =>
      (await http.post<CompleteRegistrationResult>(AUTH_ENDPOINTS.completeRegistration, input)).data,
    onSuccess: ({ user }) => {
      const session: Session = { status: 'authenticated', user };
      queryClient.setQueryData(sessionQueryKey, session);
    },
  });
}

/** `POST /api/auth/logout` */
export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, void>({
    mutationKey: authMutationKeys.logout,
    mutationFn: async () => {
      await http.post(AUTH_ENDPOINTS.logout);
    },
    onSuccess: () => {
      const session: Session = { status: 'anonymous' };
      queryClient.setQueryData(sessionQueryKey, session);
    },
  });
}
