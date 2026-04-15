# openLesson Plugin for ElizaOS

Full openLesson v2 API integration for ElizaOS — learning plans, multimodal tutoring sessions, teaching assistant, analytics, cryptographic proofs, and API key management.

## Installation

```bash
cd open-lesson
npm install
npm run build
```

## Configuration

Set your API key in the character settings:

```json
{
  "settings": {
    "OPENLESSON_API_KEY": "sk_your_api_key"
  }
}
```

Or use environment variables:
```bash
export OPENLESSON_API_KEY=sk_your_api_key
```

## Available Actions (33)

### API Key Management (4)

| Action | Description |
|--------|-------------|
| `LIST_API_KEYS` | List all API keys |
| `CREATE_API_KEY` | Create a new API key with optional label, scopes, and expiration |
| `REVOKE_API_KEY` | Revoke (soft-delete) an API key |
| `UPDATE_KEY_SCOPES` | Update the scopes on an existing key |

### Learning Plans (8)

| Action | Description |
|--------|-------------|
| `LIST_PLANS` | List plans with optional status filter and pagination |
| `CREATE_LEARNING_PLAN` | Create a plan from a topic (supports difficulty, duration, user context) |
| `GET_PLAN` | Get a plan with its nodes and progress statistics |
| `UPDATE_PLAN` | Update plan metadata — title, notes, or status |
| `DELETE_PLAN` | Delete a plan, its nodes, and unlink sessions |
| `GET_PLAN_NODES` | Get plan nodes with edges and graph info |
| `ADAPT_LEARNING_PLAN` | AI-powered plan adaptation via natural-language instruction |
| `CREATE_PLAN_FROM_VIDEO` | Create a plan from a YouTube video URL |

### Sessions (11)

| Action | Description |
|--------|-------------|
| `LIST_SESSIONS` | List sessions with optional status/plan filter and pagination |
| `START_SESSION` | Start a session — standalone or linked to a plan node |
| `GET_SESSION` | Get session details, statistics, and active probes |
| `ANALYZE_HEARTBEAT` | Multimodal analysis heartbeat (text, audio, image) |
| `PAUSE_SESSION` | Pause a session with optional reason |
| `RESUME_SESSION` | Resume a paused session — returns reorientation probe |
| `RESTART_SESSION` | Restart a session with new strategy |
| `END_SESSION` | End a session — generates report and Merkle batch proof |
| `GET_SESSION_PROBES` | List probes (active, archived, or all) |
| `GET_SESSION_PLAN` | Get session tutoring plan with step statistics |
| `GET_SESSION_TRANSCRIPT` | Get transcript (full, summary, or chunks) |

### Teaching Assistant (2)

| Action | Description |
|--------|-------------|
| `ASK_ASSISTANT` | Ask a question within a session (supports conversation threading) |
| `GET_CONVERSATION_HISTORY` | Get full message history for a conversation |

### Analytics (3)

| Action | Description |
|--------|-------------|
| `GET_USER_ANALYTICS` | User-wide analytics — overview, performance trends, streaks, achievements |
| `GET_SESSION_ANALYTICS` | Per-session analytics — probes, gap timeline, plan progress |
| `GET_PLAN_ANALYTICS` | Per-plan analytics — progress, strongest/weakest topics, recommendations |

### Cryptographic Proofs (5)

| Action | Description |
|--------|-------------|
| `LIST_PROOFS` | List proofs with filters (session, plan, type, anchored) |
| `GET_PROOF` | Get proof details with chain context and related proofs |
| `VERIFY_PROOF` | Verify proof integrity — fingerprint, chain, and anchor checks |
| `ANCHOR_PROOF` | Anchor a proof on Solana (simulated) |
| `GET_SESSION_PROOF_BATCH` | Get the Merkle tree batch for a session |

## API Reference

- **Base URL:** `https://www.openlesson.academy/api/v2/agent/`
- **Auth:** `Authorization: Bearer sk_...`
- **Rate limit:** 120 req/min
- Every mutation generates a cryptographic proof (SHA-256 fingerprint)
- Analysis is multimodal: audio (base64 webm/mp4/ogg), text, images

## Character File

Use the character file at `characters/open-lesson.car.json` to load the agent with this plugin pre-configured.

## Development

```bash
npm run dev    # Watch mode
npm run build  # Build
npm test       # Test
```

## License

MIT
