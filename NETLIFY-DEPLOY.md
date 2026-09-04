# Liqora deployment

## Netlify frontend

Upload this project ZIP to Netlify, or connect the repository. The included
`netlify.toml` sets the Vite build command and publishes the Liqora frontend.

Netlify environment variables:

- `VITE_API_BASE_URL`: public HTTPS URL of the separately hosted Liqora API
  server, if the API is not served from the same domain.

## API server

The API is in `artifacts/api-server`. It is a Node/Express service and is not
started by Netlify's static frontend hosting. Run it on a Node service with:

```bash
pnpm --filter @workspace/api-server run dev
```

Set `PORT` for the API service. Keep `KEEPER_PRIVATE_KEY` and `SESSION_SECRET`
in that service's secret manager; never put them in the Netlify upload.

The frontend can still be previewed without the API, but market data, position
discovery, keeper status, and server-side transaction simulation require the
API URL.