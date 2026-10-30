# Madfun ticketing site

A standalone event discovery, organizer dashboard, and reservation app inspired by the workflows in Hi.Events.

## Start locally

1. Install Node.js 20 or later.
2. Copy `.env.example` to `.env.local` if you need to recreate the local setup.
3. Run `npm install`, then `npm run dev` and open `http://localhost:5173`.

The local `.env.local` connects this build to the Madfun Supabase project. It is ignored by Git. The tracked `.env.production` contains only the Supabase project URL and publishable browser key, which lets Vercel build the app already connected to the database. Never add a Supabase secret or service-role key to this repository or browser app.

## Supabase

The migration in `supabase/migrations/` creates `gather_events` and `gather_orders`, enables row-level security, applies explicit Data API grants, and seeds six public sample events. It has been applied to the connected project. Event browsing and manual-payment ticket bookings are public; buyers do not need an account. Admin and organizer tools require sign-in. Booking amounts and payment submissions are validated in the database.

For local email-link sign-in, add the Vite address (`http://localhost:5173`) to Supabase Authentication → URL Configuration → Redirect URLs. After importing the GitHub repository to Vercel, add the deployed Vercel domain to the same redirect allowlist. Guest M-Pesa and Binance Pay submissions are recorded for manual review; they are not automatically verified and do not issue entry tickets.

## Build

`npm run build` creates the production files in `dist/`.




### Manual payment bookings

The Bayern vs Ajax listing accepts full-total manual payment submissions by M-Pesa to +254105062638 or Binance Pay to Binance ID 94780808. Buyers enter their contact phone and the matching transfer reference; Binance buyers also enter the asset and amount they sent. Madfun immediately downloads a PDF submission receipt marked pending manual verification; it is not proof of cleared funds or an event-entry ticket. The app does not automatically verify either payment method or collect money.


### Admin access

The admin console is hidden from regular accounts. To grant admin access, run this in the Supabase SQL Editor with the intended account email:

```sql
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"gather_admin": true}'::jsonb
where email = 'YOUR_LOGIN_EMAIL';
```

Sign out and back in to refresh the account claim. Admin access is checked by Supabase row-level security as well as the app navigation.
## Vercel hosting

Import this project into Vercel as a Vite app. The included `vercel.json` sets the build command and output directory. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` as Vercel environment variables for Preview and Production; keep `.env.local` out of Git. Vercel hosts the website, while event, booking, and payment-submission records remain in Supabase. After deployment, add the Vercel domain to Supabase Authentication's allowed redirect URLs.
