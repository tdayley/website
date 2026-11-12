# Supabase setup

The Secret Santa app (`/gifts`) uses Supabase for Postgres, magic-link login and row-level security.

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

## Email notifications

The site emails everyone when names are drawn, and sends a reminder when an exchange is a
week away. Neither email says who anyone is buying for; they link to the site.

If any of this isn't set up, the site simply sends nothing. The draw still works.

### Server-only settings (Amplify > Hosting > Environment variables)

| Name | Value |
|---|---|
| `SUPABASE_SECRET_KEY` | Supabase > Project Settings > API Keys > secret key (`sb_secret_...`). **Bypasses the access rules. Never give it a `NEXT_PUBLIC_` name.** Used only to look up members' email addresses. |
| `RESEND_API_KEY` | A Resend API key with "Sending access" (resend.com > API Keys). |
| `CRON_SECRET` | Any long random string. The daily reminder job must present it. |
| `EMAIL_FROM` | Optional. Defaults to `Secret Santa <gifts@timdayley.com>`; must be an address at the domain verified in Resend. |

`amplify.yml` copies these into the running site during the build (Amplify doesn't do that
by itself for server-only variables). After changing them, redeploy.

### Daily reminder job

`.github/workflows/gift-reminders.yml` runs once a day and calls
`POST https://timdayley.com/api/gifts/reminders` with the secret.

- Add the same `CRON_SECRET` value in GitHub: repo > Settings > Secrets and variables >
  Actions > New repository secret.
- Each exchange gets its reminder once, the first day it's 7 or fewer days away. If names
  haven't been drawn by then, only the organizer is emailed.
- GitHub pauses scheduled workflows in repositories with no activity for 60 days. If it has
  been quiet since last Christmas, re-enable it under the repo's Actions tab each November
  (the same time you unpause the Supabase project).
- To test: Actions tab > "Secret Santa reminders" > Run workflow.

## Running Secret Santa on its own subdomain (gifts.timdayley.com)

The app can live at `gifts.timdayley.com` with short addresses (`/wishlist`, `/groups/...`)
instead of `timdayley.com/gifts/...`. The pages stay in `app/gifts/`; `proxy.ts` maps the short
addresses onto them when a request arrives on the host named in `GIFTS_HOST`. With `GIFTS_HOST`
unset, nothing changes.

Roll it out in two stages, so a problem in stage 1 leaves the current address working.

### Stage 1: turn the subdomain on

1. **Amplify** > Hosting > Custom domains > `timdayley.com` > add subdomain `gifts`, pointing at
   the `main` branch. Amplify creates the Route 53 record and certificate. Wait for "Available".
2. **Amplify** > Hosting > Environment variables: add `GIFTS_HOST` = `gifts.timdayley.com`, then
   redeploy.
3. Open `https://gifts.timdayley.com`. You should see the Secret Santa sign-in page.
   - If you see the main homepage instead, the site isn't recognizing the subdomain. Nothing is
     broken (`timdayley.com/gifts` still works); stop here and investigate.
4. **Supabase** > Authentication > URL Configuration:
   - Add `https://gifts.timdayley.com/**` to Redirect URLs.
   - Change Site URL to `https://gifts.timdayley.com` (the sign-in email's button uses it).
5. Sign in on `gifts.timdayley.com` and click around. Sign-ins don't carry over between the two
   addresses, so everyone signs in once on the new one.

### Stage 2: forward the old address

6. **Amplify** environment variables: add `GIFTS_REDIRECT_OLD` = `1`, then redeploy.
   `timdayley.com/gifts/...` now forwards to `gifts.timdayley.com/...`, so old invite links and
   bookmarks keep working.

To undo either stage, remove its variable and redeploy.
