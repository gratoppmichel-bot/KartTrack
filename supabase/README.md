# Supabase

- `functions/send-push/` – Edge Function (deployed, `verify_jwt = true`). Sends Web Push for friend
  requests. Needs the secret `VAPID_PRIVATE_KEY` (set in the Supabase dashboard under
  Edge Functions -> Secrets). The matching public key is `NEXT_PUBLIC_VAPID_PUBLIC_KEY`.
- `pending/delete_my_account.sql` – account deletion function; run once in the SQL editor.

The schema itself lives in the Supabase project's migration history (`list_migrations`).
