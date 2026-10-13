/**
 * Axios instance for the NestJS backend.
 *
 * In development `VITE_API_URL` is empty, so requests go to `/api/*` on the Vite dev server,
 * which proxies them to the backend (see vite.config.ts).
 *
 * Responses are Axios responses: the payload is in `.data`, and HTTP errors (e.g. a Nest
 * `BadRequestException`) are thrown as `AxiosError`s (see `errors.ts`).
 *
 * `withCredentials` lets the browser send the `httpOnly` auth cookies if the API is on another
 * origin (`VITE_API_URL`).
 */
import axios from 'axios';

export const http = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL ?? ''}/api`,
  withCredentials: true,
});
