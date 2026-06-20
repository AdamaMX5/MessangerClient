# MessageService — Channel Message Endpoints

Status: **live.** The MessengerClient uses these routes
(`messageService.sendChannelMessage` / `getChannelMessages`) as the sole source
of truth for channel messages. The former embedded ObjectService channel-message
fallback (`channels[].data.messages`) has been removed.

## Motivation

Channel text messages (`type: 'text'` and `announcement`) used to be embedded
in the channel object inside the ObjectService (`channels` collection,
`data.messages`). This did not scale: every message append required a
read-modify-write of the whole channel document, there was no pagination, and
concurrent senders raced on the array.

The DM model in the MessageService already solves all of this for 1:1 messages.
These endpoints extend the same model to channel-scoped messages. The only
difference from the DM data model is that channel messages have **no `readAt`**
field — channels are many-to-many, so per-recipient read state is out of scope
here (a separate read-receipt model can come later).

## Auth

Bearer JWT (same as all other MessageService routes). The service authorizes
based on the caller's channel membership (`sub` claim ∈ channel `memberIds`).
CORS is handled centrally on NGINX.

## Endpoints

### `POST /channels/:channelId/messages`

Send a message to a channel.

| | |
|---|---|
| Body | `{ "body": string }` |
| Response `201` | `ServiceMessage` (see below) |
| Errors | `403` not a member, `404` channel unknown |

### `GET /channels/:channelId/messages?page&limit`

List messages in a channel, newest-relevant ordering, paginated.

| | |
|---|---|
| Query | `page` (default 1), `limit` (default 100) |
| Response `200` | `ServiceMessage[]` or `{ data: ServiceMessage[] }` |
| Errors | `403` not a member, `404` channel unknown |

## `ServiceMessage` shape (channel variant)

```jsonc
{
  "id": "string",
  "senderId": "string",   // JWT sub of the author
  "channelId": "string",  // replaces recipientId from the DM model
  "body": "string",
  "createdAt": "ISO-8601 string"
  // NOTE: no readAt — see Motivation above
}
```

The client normalizes this into its UI `Message` type with `readAt: null`.
