# API Configuration Guide

This project supports switching between local development and production (ngrok) endpoints.

## Quick Start

### Default Behavior
- **Development mode** (`npm run dev`): Uses `http://localhost:3000`
- **Production mode** (`npm run dev:prod`): Uses `https://trueclaimbackend.ngrok.app`

## Environment Variables

You can override the default API URL by creating a `.env.local` file in the `client/` directory:

### For Local Development (localhost:3000)
Create `client/.env.local`:
```
VITE_API_URL=http://localhost:3000
```

### For Production/Testing (ngrok)
Create `client/.env.local`:
```
VITE_API_URL=https://trueclaimbackend.ngrok.app
```

## NPM Scripts

- `npm run dev` - Development mode (defaults to localhost:3000)
- `npm run dev:local` - Explicitly use development mode (localhost:3000)
- `npm run dev:prod` - Use production mode (ngrok endpoint)

## How It Works

The API configuration is in `client/src/config/api.ts`:
- Checks for `VITE_API_URL` environment variable first
- Falls back to ngrok for production mode
- Defaults to localhost:3000 for development mode

All API calls use the `apiUrl()` helper function which automatically uses the correct endpoint.

## Debugging

When running in development mode, check the browser console for:
- `🔧 API Base URL: [your endpoint]`
- `🔧 Mode: [development/production]`

This helps you verify which endpoint is being used.

