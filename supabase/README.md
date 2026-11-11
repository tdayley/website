# Supabase setup

The gift exchange app (`/gifts`) uses Supabase for Postgres, magic-link login and row-level security.

## Environment variables (Amplify and local `.env.local`)

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL, e.g. `https://abcdefghijkl.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key (`sb_publishable_...`) or the legacy anon key |

Both are public by design; the database's row-level security is what protects data.
Never put the secret / `service_role` key in a `NEXT_PUBLIC_` variable.

## Applying migrations

Run each file in `migrations/` in order: Supabase dashboard > SQL Editor > paste > Run.
(Or with the Supabase CLI: `supabase link` then `supabase db push`.)

## Auth settings (Supabase dashboard > Authentication)

- **URL Configuration**
  - Site URL: `https://timdayley.com`
  - Redirect URLs: `https://timdayley.com/**`, `https://www.timdayley.com/**`, `http://localhost:3000/**`
- **Email Templates > Magic Link**: so links work when opened on a different device or
  browser than the one that asked for them, change the link to:
  ```html
  <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email">Sign in</a>
  ```
  Without this change, Supabase's default link still works, but only in the same browser.
- **Email sending**: Supabase's built-in email sender is heavily rate-limited and, on new
  projects, only delivers to the project's team members. Set up custom SMTP (e.g. a free
  Resend or Postmark account) before inviting family.

## Testing the access rules locally

`tests/run.sh` loads a small stand-in for Supabase's `auth` schema and roles into a throwaway
local Postgres database, applies all migrations, and checks who can see and change what.

```bash
supabase/tests/run.sh
```

## Item photos (Supabase Storage)

Photos added to wish list items are stored in a private bucket, `item-photos`, created by
`migrations/20261111000000_item_photos.sql`. Files are `item-photos/<user id>/<photo id>.jpg`.

- Access rules are on `storage.objects`: you can upload and delete only in your own folder; photos
  are readable by you and by people who share an exchange with you. Pages show them through
  links that expire after an hour.
- The browser shrinks photos to at most 1200px JPEGs before upload (typically 100-300 KB), so the
  free tier's 1 GB of storage holds thousands.
- The stored file is deleted when its item is removed or its photo is replaced. Uploads that were
  never saved with an item are deleted once they're a day old, the next time that person uploads.
- The post-season export should include this bucket as well as the database
  (Storage > item-photos > select all > Download).
