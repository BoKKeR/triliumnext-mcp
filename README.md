# TriliumNext MCP Server

A Model Context Protocol (MCP) server for interacting with [TriliumNext](https://github.com/TriliumNext/Notes) via its ETAPI. Enables LLMs to create, read, update, and organize notes — including embedding images and files directly into note content.

## Features

- **35 tools** across 8 categories for full note management, search, organization, attachments, revisions, and system operations
- **Inline image and file embedding** — attach images and files when creating or updating notes in a single tool call
- **Data URL support** — pass image/file data as raw base64 or `data:` URLs
- **Three content update modes** — full replacement, search/replace, and unified diff
- **Markdown support** — write in markdown, stored as HTML automatically
- **Image-aware content retrieval** — `get_note_content` returns embedded images as visual content blocks
- Support for both STDIO and HTTP (SSE) transports
- Flexible configuration via CLI, environment variables, or config file
- TypeScript with full type safety

## Installation

```bash
git clone https://github.com/perfectra1n/triliumnext-mcp
cd triliumnext-mcp
npm install
npm run build
```

### Adding to Claude Code

```bash
claude mcp add trilium node /path/to/triliumnext-mcp/dist/index.js \
  --scope user \
  -e TRILIUM_TOKEN=<your_etapi_token> \
  -e TRILIUM_URL=<your_trilium_url_e.g._https://trilium.example.com/etapi>
```

This adds the server at user scope (available across all repositories) in your `~/.claude.json`.

## Configuration

Configuration precedence (highest to lowest):
1. CLI arguments
2. Environment variables
3. Configuration file (`./trilium-mcp.json` or `~/.trilium-mcp.json`)
4. Default values

### CLI Arguments

```bash
npm install -g .
triliumnext-mcp --url http://localhost:37740/etapi --token YOUR_TOKEN
```

Options:
- `-u, --url <url>` — Trilium ETAPI URL (default: `http://localhost:37740/etapi`)
- `-t, --token <token>` — Trilium ETAPI token (required)
- `--transport <type>` — Transport type: `stdio` or `http` (default: `stdio`)
- `-p, --port <port>` — HTTP server port when using http transport (default: `3000`)
- `-h, --help` — Show help message

### Environment Variables

```bash
export TRILIUM_URL=http://localhost:37740/etapi
export TRILIUM_TOKEN=your-etapi-token
export TRILIUM_TRANSPORT=stdio
export TRILIUM_HTTP_PORT=3000
```

### Config File

Create `trilium-mcp.json` in the current directory or `~/.trilium-mcp.json`:

```json
{
  "url": "http://localhost:37740/etapi",
  "token": "your-etapi-token",
  "transport": "stdio",
  "httpPort": 3000
}
```

## Available Tools

### Notes (10 tools)

| Tool | Description |
|------|-------------|
| `create_note` | Create a note with title, content, type, and parent. Supports inline image/file embedding. |
| `get_note` | Get note metadata by ID (title, type, attributes, parent/child relationships) |
| `get_note_content` | Get note content as HTML or markdown. Automatically includes embedded images as visual content blocks. |
| `update_note` | Update note metadata (title, type, MIME type) |
| `update_note_content` | Update note content via full replacement, search/replace, or unified diff. Supports inline image/file embedding in replacement mode. |
| `append_note_content` | Append content or edit via search/replace or diff. Supports inline image/file embedding in append mode. |
| `delete_note` | Delete a note and all its branches |
| `undelete_note` | Restore a previously deleted note |
| `get_note_attachments` | List all attachments for a note |
| `get_note_history` | Get recent changes (creations, modifications, deletions) with optional subtree filtering |

### Search & Discovery (2 tools)

| Tool | Description |
|------|-------------|
| `search_notes` | Full-text and attribute search with filters, ordering, and limits |
| `get_note_tree` | Get children of a note for tree navigation |

### Organization (4 tools)

| Tool | Description |
|------|-------------|
| `move_note` | Move a note to a different parent |
| `clone_note` | Clone a note to appear under multiple parents |
| `reorder_notes` | Change note positions within a parent |
| `delete_branch` | Remove a branch without deleting the note |

### Attributes & Labels (4 tools)

| Tool | Description |
|------|-------------|
| `get_attributes` | Get all attributes (labels/relations) of a note |
| `get_attribute` | Get a single attribute by ID |
| `set_attribute` | Add or update an attribute on a note |
| `delete_attribute` | Remove an attribute from a note |

### Calendar & Journal (2 tools)

| Tool | Description |
|------|-------------|
| `get_day_note` | Get or create the daily note for a date |
| `get_inbox_note` | Get the inbox note for quick capture |

### Attachments (6 tools)

| Tool | Description |
|------|-------------|
| `create_attachment` | Create a new attachment (image or file) for a note |
| `get_attachment` | Get attachment metadata by ID |
| `update_attachment` | Update attachment metadata (role, MIME, title, position) |
| `delete_attachment` | Delete an attachment |
| `get_attachment_content` | Get attachment content — images returned as visual content blocks |
| `update_attachment_content` | Update attachment content via replacement, search/replace, or diff |

### Revisions (3 tools)

| Tool | Description |
|------|-------------|
| `get_note_revisions` | List all revision snapshots for a note |
| `get_revision` | Get revision metadata by ID |
| `get_revision_content` | Get the content of a historical revision |

### System (4 tools)

| Tool | Description |
|------|-------------|
| `create_revision` | Create a revision snapshot of a note |
| `create_backup` | Create a full database backup |
| `export_note` | Export a note subtree as a ZIP file |
| `search_tools` | Search available tools by keyword or category |

## Embedding Images and Files

When creating or updating notes, you can embed images and files directly in a single tool call using the `images` and `files` parameters.

### Image Embedding

Pass an `images` array and reference them in your content with `image:0`, `image:1`, etc.:

```json
{
  "tool": "create_note",
  "arguments": {
    "parentNoteId": "root",
    "title": "My Note",
    "type": "text",
    "content": "<p>Here is a photo:</p><img src=\"image:0\">",
    "images": [
      {
        "data": "iVBORw0KGgo...",
        "mime": "image/png",
        "filename": "photo.png"
      }
    ]
  }
}
```

In markdown mode, use `![alt text](image:0)`:

```json
{
  "content": "# My Note\n\n![photo](image:0)\n\nSome text.",
  "format": "markdown",
  "images": [{ "data": "iVBORw0KGgo...", "mime": "image/png", "filename": "photo.png" }]
}
```

Images without a matching placeholder are automatically appended at the end of the content.

### File Embedding

Pass a `files` array and reference them with `file:0`, `file:1`, etc.:

```json
{
  "content": "<p>Download the report: <a href=\"file:0\">Report PDF</a></p>",
  "files": [
    {
      "data": "JVBERi0xLjQ...",
      "mime": "application/pdf",
      "filename": "report.pdf"
    }
  ]
}
```

Files without a matching placeholder are appended as download links.

### Data URL Support

The `data` field accepts both raw base64 and data URLs. When a data URL is provided, the MIME type is automatically extracted (overriding the `mime` field):

```json
{
  "images": [
    {
      "data": "data:image/png;base64,iVBORw0KGgo...",
      "mime": "ignored-when-data-url-is-used",
      "filename": "screenshot.png"
    }
  ]
}
```

### Content Update Modes

The `update_note_content` and `append_note_content` tools support three modes (images/files only work with mode 1):

1. **Full replacement** (`content`) — replace or append entire content, with optional markdown conversion
2. **Search/replace** (`changes`) — array of `{old_string, new_string}` blocks applied sequentially
3. **Unified diff** (`patch`) — a unified diff string applied to existing content

## Debugging with MCP Inspector

[MCP Inspector](https://github.com/modelcontextprotocol/inspector) provides a web UI for testing tools interactively:

```bash
TRILIUM_URL=http://localhost:37740/etapi TRILIUM_TOKEN=your-token npm run inspector
```

Opens at `http://localhost:6274` where you can browse tools, execute calls, and inspect responses.

## Development

### Prerequisites

- Node.js 20+
- npm
- Docker (for integration tests)

### Setup

```bash
npm install          # Install dependencies
npm run build        # Build TypeScript
npm test             # Run unit tests
npm run test:integration  # Run integration tests (starts Trilium in Docker)
npm run lint         # Run linter
npm run format       # Format code
```

### Docker

Start Trilium and the MCP server:

```bash
cd docker
TRILIUM_TOKEN=your-token docker compose up -d
```

Build the Docker image:

```bash
docker build -t triliumnext-mcp -f docker/Dockerfile .
```

## Getting an ETAPI Token

1. Open TriliumNext in your browser
2. Go to Options (gear icon) → ETAPI
3. Create a new ETAPI token
4. Copy the token and use it in your configuration

## License

MIT
