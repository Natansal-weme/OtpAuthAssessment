# Assumptions & Product Decisions

Decisions that affect what users experience. Technical rationale: [docs/otp-design.md](docs/otp-design.md).

## Who can sign in

- **Israeli numbers only**, entered in local format starting with `0` (e.g. `050-123-4567`). No
  country-code input.
- **Landlines are accepted**, not only mobiles: some Israeli landlines receive SMS as a voice call.
- Spaces and dashes are ignored, so `050-123-4567` and `0501234567` are the same account.
- **The phone number is the identity.** One account per phone.

## Verification codes

- 6 digits, valid for **5 minutes**.
- **3 wrong attempts** invalidate the code; the user must request a new one.
- Requesting a new code invalidates the previous one: only the latest code works.
- A new code can be requested every **30 seconds**, at most **5 codes per phone per hour**.
- Too many requests from one network (10 per minute) are temporarily blocked.
- The sign-in screen never reveals whether a phone number is already registered.

## Registration

- Unknown phones go through a profile step after verification: **full name** (1–100 characters) and
  **email**.
- Email is required but **not unique**, and not verified: it's contact data, not a login method.
- **An account exists only once the profile is complete.** Abandoning the profile step creates nothing.
- The profile step must be completed within **15 minutes** of verifying, in the same browser.
  Otherwise the user starts over with a new code.

## Sessions

- Signed-in users stay signed in for **7 days**, then must verify again. Activity does not extend this.
- Signing out ends the session on the server immediately.
- Signed-in users visiting the sign-in pages are sent to their home page, and vice versa.
- After signing in, users land on a minimal home page (name, phone, email, sign out).
