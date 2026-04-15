# openLesson Plugin for ElizaOS

openLesson tutoring platform integration for ElizaOS - generate learning plans, start guided tutoring sessions, and analyze audio for reasoning gaps.

## Installation

```bash
# Navigate to plugin directory
cd public/elizaos/open-lesson

# Install dependencies
bun install

# Build the plugin
bun run build

# Link for local development
bun link
```

## Usage

### Option 1: Link to your project

```bash
# In your ElizaOS project
bun link @openlesson/plugin-elizaos

# Add to package.json
{
  "dependencies": {
    "@openlesson/plugin-elizaos": "link:@openlesson/plugin-elizaos"
  }
}
```

### Option 2: Add as workspace dependency

Add to your root `package.json`:
```json
{
  "workspaces": [
    "public/elizaos/open-lesson"
  ]
}
```

## Configuration

Set your API key in the character settings:

```json
{
  "settings": {
    "OPENLESSON_API_KEY": "sk_your_api_key",
    "OPENLESSON_BASE_URL": "https://www.openlesson.academy"
  }
}
```

Or use environment variables:
```bash
export OPENLESSON_API_KEY=sk_your_api_key
```

## Available Actions

1. **GENERATE_LEARNING_PLAN** - Generate a personalized learning plan as a directed graph
2. **START_SESSION** - Start a new guided tutoring session
3. **ANALYZE_AUDIO** - Submit audio for reasoning gap analysis
4. **END_SESSION** - End a session and generate a summary
5. **GET_SESSION_SUMMARY** - Retrieve the session report

## Character File

Use the character file at `public/elizaos/characters/open-lesson.car.json` to load the agent with this plugin pre-configured.

## Development

```bash
# Watch mode
bun run dev

# Build
bun run build

# Test
bun test
```

## License

MIT
