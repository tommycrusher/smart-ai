# Smart AI anonymous Posthog telemetry

## Behavior

- Used by Smart AI for product metrics (not used by customers)
- uses public posthog key in repo
- `SMARTAI_TELEMETRY_ENABLED=0` disables telemetry
- non-anonymous and private data like code is never sent to posthog
- Event user ids are the Smart AI user id is signed in, or a unique machine id if not
- Current events are slash command usage and chat calls
