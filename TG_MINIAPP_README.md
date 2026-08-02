# Verity Telegram Pre-Launch Mini App

Mobile-only acquisition page for the period before the 2026/27 season. It
captures verified Telegram identities, club choices, referral activity and
share clicks. It does not expose the Verity game, wallets, payments or chain
features.

## Routes

- Mini App: `http://localhost:3000/tg-miniapp`
- Public configuration: `GET /api/prelaunch/config`
- Admin JSON: `GET /api/prelaunch/admin`
- Telegram session: `POST /api/prelaunch/session`
- Club selection: `PATCH /api/prelaunch/club`
- Share tracking: `POST /api/prelaunch/share-click`
- Launch-day duel hook: `POST /api/prelaunch/internal/duels`

The launch dates, ticket cap and 20-club list have one source of truth:
[`backend/src/modules/prelaunch/prelaunch.config.ts`](backend/src/modules/prelaunch/prelaunch.config.ts).
Set the exact Community Shield UTC kickoff there before deployment.

## Environment variables

Backend (`backend/.env`):

```dotenv
TELEGRAM_BOT_TOKEN=123456:replace_me
TELEGRAM_BOT_USERNAME=your_bot_username
TELEGRAM_INIT_DATA_MAX_AGE_SECONDS=86400
PRELAUNCH_ADMIN_KEY=replace_with_a_long_random_value
PRELAUNCH_INTERNAL_SECRET=replace_with_a_different_long_random_value
ALLOW_TELEGRAM_DEV_AUTH=false
```

Frontend (`frontend/.env.local`):

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:5050/api
NEXT_PUBLIC_TELEGRAM_DEV_MODE=false
```

`TELEGRAM_BOT_TOKEN`, admin keys and internal secrets are server-only. Never
add them to a `NEXT_PUBLIC_` variable.

## Local seed and preview

1. Run MongoDB and install the existing workspace dependencies.
2. Seed deterministic pre-launch users:

   ```bash
   pnpm --filter verity-backend seed:prelaunch
   ```

3. For a browser-only local preview, temporarily set:

   ```dotenv
   # backend/.env
   ALLOW_TELEGRAM_DEV_AUTH=true

   # frontend/.env.local
   NEXT_PUBLIC_TELEGRAM_DEV_MODE=true
   NEXT_PUBLIC_TELEGRAM_DEV_USER_ID=900000001
   NEXT_PUBLIC_TELEGRAM_DEV_USERNAME=local_player
   ```

4. Start both services:

   ```bash
   pnpm dev:backend
   pnpm dev:frontend
   ```

5. Open `http://localhost:3000/tg-miniapp` at a narrow viewport. The seeded
   local account has two activated referrals and three pending referrals.

Development identity headers are accepted only when
`ALLOW_TELEGRAM_DEV_AUTH=true` and `NODE_ENV` is not `production`.

## Point the bot at the Mini App

Deploy the frontend to HTTPS, with `/tg-miniapp` publicly reachable, then in
`@BotFather`:

1. Open `/mybots` and select the Verity bot.
2. Open **Bot Settings → Configure Mini App → Enable Mini App**.
3. Set the Mini App URL to `https://your-domain.example/tg-miniapp`.
4. Optionally set **Bot Settings → Menu Button** to the same URL and label it
   `Open Verity`.

Telegram documents the current setup paths and launch modes in its
[Mini Apps guide](https://core.telegram.org/bots/webapps).

Referral links intentionally use the requested bot-start format:

```text
https://t.me/<BOT_USERNAME>?start=ref_<telegramUserId>
```

The bot receives `/start ref_<telegramUserId>`. Its start handler must then
open the Main Mini App with the same payload as `startapp`, for example:

```text
https://t.me/<BOT_USERNAME>?startapp=ref_<telegramUserId>
```

Telegram passes that value to the Mini App as `start_param` and
`tgWebAppStartParam`. The frontend sends it with signed `initData`; the server
rejects self-referrals and applies a referral only when an account is first
created.

## Security and referral activation

- Every user-facing mutation re-verifies Telegram `initData` server-side with
  the bot-token HMAC flow and checks `auth_date` freshness.
- `telegramId` is unique, so one Telegram account creates one pre-launch user.
- Raw referrals and activated referrals are stored and reported separately.
- A referral remains `pending` until the referred user completes two duels
  after launch.
- The duel service should call `POST /api/prelaunch/internal/duels` with:

  ```http
  x-prelaunch-internal-secret: <PRELAUNCH_INTERNAL_SECRET>
  Content-Type: application/json

  {"telegramId":"123456789"}
  ```

- Activation uses unique server-assigned ticket slots `1..25`, so concurrent
  requests cannot activate more than the configured cap.

## Admin JSON

```bash
curl http://localhost:5050/api/prelaunch/admin \
  -H "x-prelaunch-admin-key: $PRELAUNCH_ADMIN_KEY"
```

The response keeps `rawReferrals` and `activatedReferrals` separate and also
returns total users, users by club and share clicks.
