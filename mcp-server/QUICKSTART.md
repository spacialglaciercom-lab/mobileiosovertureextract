# Quick Start Guide - Overture Maps MCP Server

Get up and running with the MCP server in 5 minutes.

## Prerequisites

- Node.js 18+ installed
- Rust backend running on `http://localhost:8080`

## Installation

```bash
# Navigate to MCP server directory
cd mcp-server

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Build the server
npm run build
```

## Test the Server

```bash
# Start the server
npm start

# In another terminal, test with a simple health check
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node dist/index.js
```

## Configure Bob Shell

1. **Edit `.bob/settings.json`** in your project root:

```json
{
  "mcpServers": {
    "overture-maps": {
      "command": "node",
      "args": ["mcp-server/dist/index.js"],
      "env": {
        "OVERTURE_BACKEND_URL": "http://localhost:8080",
        "OVERTURE_WS_URL": "ws://localhost:8080"
      },
      "trust": true
    }
  }
}
```

2. **Restart Bob Shell**

3. **Verify tools are available**:
```bash
/tools list
```

You should see 8 tools starting with `overture_*`.

## First Extraction

Try this in Bob Shell:

```
Extract road network for a small area in San Francisco:
- Latitude: 37.7749 to 37.7849
- Longitude: -122.4194 to -122.4094
```

Bob Shell will:
1. Create a polygon from your coordinates
2. Check if it's cached using `overture_extract_check`
3. If not cached, extract using `overture_extract_polygon`
4. Download results and show statistics

## Common Commands

```bash
# Development mode (auto-reload)
npm run dev

# Run tests
npm test

# Check types
npm run build

# Format code
npm run format
```

## Troubleshooting

**Tools not showing in Bob Shell?**
- Check absolute path in `.bob/settings.json`
- Restart Bob Shell
- Run `npm run build` to ensure latest code

**Backend connection fails?**
- Verify backend is running: `curl http://localhost:8080/health`
- Check URLs in `.env`
- Check firewall settings

**WebSocket timeout?**
- Increase `timeout_seconds` parameter
- Check backend logs for errors
- Verify WebSocket URL is correct

## Next Steps

- Read [README.md](README.md) for detailed documentation
- See [MCP_TOOLS_IMPLEMENTATION_PLAN.md](../MCP_TOOLS_IMPLEMENTATION_PLAN.md) for architecture
- Check [tests/](tests/) for usage examples

## Support

For issues or questions:
1. Check backend logs: `cd rust-backend && cargo run`
2. Check MCP server logs (stderr output)
3. Review Bob Shell logs
4. See troubleshooting section in README.md
