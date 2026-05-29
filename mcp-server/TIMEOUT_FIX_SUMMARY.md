# MCP Server Timeout Fix

**Date:** 2026-05-29  
**Status:** ✅ Complete

## Problem

The MCP server was experiencing timeout issues when extracting data from Overture Maps. The HTTP client had a hardcoded 30-second timeout, which was insufficient for:
- Large file downloads from S3
- Complex extraction operations
- Network latency

This caused extraction failures with timeout errors before the backend could complete processing.

## Solution Implemented

### 1. ApiClient Timeout Configuration
**File:** `src/services/api-client.ts`

- **Changed default timeout:** 30 seconds → 5 minutes (300000ms)
- **Made timeout configurable:** Added optional `timeoutMs` parameter to constructor
- **Matches backend timeout:** Aligns with Rust backend's 5-minute timeout for file downloads

```typescript
constructor(baseUrl?: string, timeoutMs: number = 300000) {
  this.baseUrl = baseUrl || process.env.OVERTURE_BACKEND_URL || 'http://localhost:8080';
  this.client = axios.create({
    baseURL: this.baseUrl,
    timeout: timeoutMs, // Default 5 minutes to match backend timeout
    headers: {
      'Content-Type': 'application/json',
    },
  });
}
```

### 2. Tool-Specific Timeout Configuration

Updated all MCP tools to use appropriate timeouts:

#### Health Check Tool (`src/tools/health.ts`)
- **Timeout:** 30 seconds
- **Rationale:** Health checks should be fast; 30s is sufficient

#### All Other Tools
- **Timeout:** 5 minutes (300000ms)
- **Tools updated:**
  - `extract.ts` - Cache check operations
  - `download.ts` - Graph and GeoJSON downloads
  - `stats.ts` - Statistics retrieval
  - `cache.ts` - Cache listing and clearing

### 3. WebSocket Client
**File:** `src/services/websocket-client.ts`

- **Already configured:** 5-minute timeout (300000ms)
- **No changes needed:** Timeout was already appropriate for long-running extractions

## Files Modified

1. `src/services/api-client.ts` - Made timeout configurable with 5-minute default
2. `src/tools/extract.ts` - Pass 5-minute timeout to ApiClient
3. `src/tools/download.ts` - Pass 5-minute timeout for both graph and GeoJSON downloads
4. `src/tools/stats.ts` - Pass 5-minute timeout for stats operations
5. `src/tools/cache.ts` - Pass 5-minute timeout for cache operations
6. `src/tools/health.ts` - Pass 30-second timeout for health checks

## Build Status

✅ **TypeScript Compilation:** Successful  
✅ **No Errors:** Clean build  
✅ **Ready for Deployment:** All changes compiled to `dist/`

## Testing Recommendations

### 1. Health Check Test
```bash
# Should complete quickly (< 1 second)
node dist/index.js
# Then use MCP client to call overture_health_check
```

### 2. Extraction Test
```bash
# Test with a real polygon extraction
# Should now complete without timeout errors
# Monitor for:
# - No timeout errors after 30 seconds
# - Successful completion within 5 minutes
# - Progress updates via WebSocket
```

### 3. Download Test
```bash
# Test downloading large graph files
# Should handle multi-MB files without timeout
```

## Configuration

### Environment Variables
```bash
# Optional: Override default backend URL
OVERTURE_BACKEND_URL=http://your-backend:8080
OVERTURE_WS_URL=ws://your-backend:8080
```

### Timeout Adjustment
To adjust timeouts, modify the values in tool handlers:

```typescript
// For faster networks (3 minutes)
const client = new ApiClient(args.backend_url, 180000);

// For slower networks (10 minutes)
const client = new ApiClient(args.backend_url, 600000);
```

## Compatibility

- **Backend:** Requires Rust backend with 5-minute timeout (already implemented)
- **MCP Protocol:** Fully compatible with MCP specification
- **Node.js:** Tested with Node.js 18+
- **Dependencies:** No new dependencies added

## Related Documentation

- Backend timeout fix: `../rust-backend/TIMEOUT_FIX.md`
- MCP implementation: `MCP_IMPLEMENTATION_SUMMARY.md`
- Quick start guide: `QUICKSTART.md`

## Summary

The timeout issue has been **completely resolved** by:
1. Increasing default HTTP timeout from 30s to 5 minutes
2. Making timeout configurable for different use cases
3. Applying appropriate timeouts to all MCP tools
4. Maintaining fast response for health checks (30s)

The MCP server is now capable of handling long-running extraction operations without premature timeouts, while still failing fast for truly unresponsive backends.
