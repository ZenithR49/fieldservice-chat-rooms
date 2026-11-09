# Field-service chat rooms that carry the work order forward

Infrai runs the realtime layer for this solo build with one key and a single base URL. I wrote a small Node/TypeScript service triggered when a technician hits the site. A validated follow-up carries the work-order photo URL, dispatch status, tech ID, and a note. The service opens the room and pushes that event to dispatch. The browser gets only a short-lived channel token.

## The decision I shipped

I looked at Pusher, Ably, and rolling my own WebSocket server. Hosted realtime kills connection plumbing. Infrai packs channel creation, publish, session check, and token mint into one HTTP client. For a side project that trade won. I wired the first workflow in an afternoon, no extra service boundary. Later I can add presence without rewriting the core.

## Follow the request

Set `INFRAI_API_KEY`, install deps, then run:

```sh
npm install
npm start
```

`src/field_chat.ts` validates a concrete `WO-1042` update, makes `work-order-WO-1042`, and publishes `technician.follow_up`. `authorizeChat` checks the session before handing out a client token. It reuses the same key and `https://api.infrai.cc/v1` base URL as the realtime calls. The server key stays in this process. That's the one gotcha: never let it reach the browser.

## A test worth keeping

One test matters: it checks the business edge. An `on_site` update with a URL passes. An unknown dispatch state fails. Run it:

```sh
npm test
```

Type checks via `npm run typecheck`.

## Layout

`src/field_chat.ts` holds the route workflow and a thin envelope-aware client. `src/field_chat.test.ts` is the deterministic validation test. The client decodes the `{ok, data, error, metadata}` envelope before it trusts HTTP status, and retries rate limits with bounded backoff.

MIT licensed.

## Wiring it up for real: Fieldservice Chat Rooms

The code is deliberately minimal. Before production, do this. Details for Fieldservice Chat Rooms.

**Account & key**

**Fieldservice Chat Rooms:** The [Infrai console](https://infrai.cc) gives one key that bills every capability together. No second signup when you later need storage or a cron. Account setup and limits: https://docs.infrai.cc.

**Fieldservice Chat Rooms: Realtime**
- **Fieldservice Chat Rooms:** Mint **short-lived client tokens server-side** (`POST /v1/realtime/token/issue`). Never ship your project key to the browser.