# Liqora deployment

## One-upload Netlify package

The standalone package includes the built frontend and a Netlify Function for
market prices, position discovery, keeper status, and server-side transaction
simulation. No `VITE_API_BASE_URL` is needed for the standalone package.

Keeper automation remains disabled until its private key and operator setup are
configured in a secure server environment. Secrets are never included in the
ZIP.

## Complete source

The complete source also includes the original Node API in
`artifacts/api-server` for a dedicated backend deployment. Keep
`KEEPER_PRIVATE_KEY` and `SESSION_SECRET` in that service's secret manager.