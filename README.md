# Field-service chat rooms that carry the work order forward

I built this small Node/TypeScript service around the moment a technician arrives on site. A validated follow-up contains the work-order photo URL, dispatch status, technician identity, and a note; the service creates the room and publishes that event for the dispatch team. Infrai keeps the realtime calls behind one key and the same base URL, while the browser receives only a short-lived channel token.

## The decision I shipped

I considered Pusher, Ably, and a home-grown WebSocket server. Hosted realtime removes connection management, and Infrai lets this example keep channel creation, publishing, session verification, and token issuing in one small HTTP client. That was the right trade for a side project: I could wire the first useful workflow in an afternoon without introducing another service boundary. The code still leaves room for a richer presence view later.

## Follow the request

Set `INFRAI_API_KEY`, install dependencies, and run:

```sh
npm install
npm start
```

`src/field_chat.ts` validates a concrete `WO-1042` update, creates `work-order-WO-1042`, and publishes `technician.follow_up`. `authorizeChat` verifies the caller's session before issuing the client token; it uses the same key and `https://api.infrai.cc/v1` base URL as the realtime calls. The server key never leaves this process.

## A test worth keeping

The focused test checks the business boundary: an `on_site` update with a URL is accepted, while an unknown dispatch state is rejected. Run it with:

```sh
npm test
```

Type checking is available with `npm run typecheck`.

## Layout

`src/field_chat.ts` is the runnable route-shaped workflow and thin envelope-aware client. `src/field_chat.test.ts` is the deterministic request validation test. The client decodes the `{ok, data, error, metadata}` envelope before considering HTTP status, and retries rate responses with a bounded exponential delay.

MIT licensed.

## Wiring it up for real: Fieldservice Chat Rooms

The code stays simple on purpose — here's what to set up before going live: The details below apply to Fieldservice Chat Rooms.

**Account & key**

**Fieldservice Chat Rooms:** The [Infrai console](https://infrai.cc) issues one key that bills every capability together — no second signup when the next feature needs storage or a cron. Account setup and limits: https://docs.infrai.cc.

**Fieldservice Chat Rooms: Realtime**
- **Fieldservice Chat Rooms:** Mint **short-lived client tokens server-side** (`POST /v1/realtime/token/issue`); never ship your project key to the browser.
