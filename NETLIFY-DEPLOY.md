# Deploy Liqora ke Netlify

Repo ini adalah pnpm workspace. Yang di-deploy ke Netlify adalah artifact
`artifacts/delta-lp` (paket `@workspace/liqora`) sebagai SPA statis, plus satu
Netlify Function tanpa dependency (`netlify/functions/api.mjs`) yang melayani
`/api/*`.

Semua sudah diatur di [`netlify.toml`](netlify.toml) — tidak perlu mengisi
apa pun secara manual di dashboard untuk deploy pertama.

| Setting | Nilai |
| --- | --- |
| Base directory | *(kosong / root repo)* |
| Build command | `pnpm --filter @workspace/liqora run build` |
| Publish directory | `artifacts/delta-lp/dist/public` |
| Functions directory | `netlify/functions` |
| Node version | 22 (via `NODE_VERSION`) |
| Package manager | pnpm 10 (via `packageManager` + `PNPM_VERSION`) |

## Cara 1 — Deploy dari GitHub (rekomendasi, auto-deploy tiap push)

1. Buka <https://app.netlify.com> lalu login (pakai akun GitHub Trixen-AI agar
   repo langsung terlihat).
2. Klik **Add new site → Import an existing project**.
3. Pilih **Deploy with GitHub**, izinkan akses, lalu pilih repo
   `Trixen-AI/fefer`.
4. Di layar konfigurasi, biarkan semua field apa adanya. Netlify membaca
   `netlify.toml` dan mengisi build command, publish dir, dan functions dir
   secara otomatis. Jangan menimpanya lewat form.
5. Klik **Deploy site**. Build pertama sekitar 2–4 menit (install pnpm
   workspace + `vite build`).
6. Setelah selesai, situs hidup di `https://<nama-acak>.netlify.app`. Ganti
   nama lewat **Site configuration → Site details → Change site name**.

Setiap `git push` ke branch `main` akan memicu deploy baru secara otomatis.
Pull request akan mendapat Deploy Preview dengan URL sendiri.

## Cara 2 — Deploy dari terminal (Netlify CLI)

```bash
npm install -g netlify-cli     # sekali saja
netlify login                  # buka browser, login akun Trixen-AI
netlify init                   # hubungkan folder ini ke site Netlify
netlify deploy --build         # deploy ke URL preview
netlify deploy --build --prod  # deploy ke production
```

`netlify deploy --build` menjalankan build command dari `netlify.toml`, jadi
hasilnya identik dengan build di CI.

> Catatan: build **hanya bisa jalan di Linux x64**. `pnpm-lock.yaml` repo ini
> sengaja membuang binary native untuk Windows/macOS (lihat blok `overrides`
> di `pnpm-workspace.yaml`), jadi `vite build` di Windows akan gagal dengan
> `Cannot find module '@rollup/rollup-win32-x64-msvc'`. Netlify memakai image
> Linux, jadi aman. Untuk build lokal di Windows, pakai WSL atau Docker.

## Environment variables

Nilai build sudah tertulis di `netlify.toml` pada blok `[build.environment]`,
termasuk:

- `PORT` dan `BASE_PATH` — wajib, `vite.config.ts` melempar error kalau kosong.
- `VITE_API_BASE_URL` — sengaja kosong supaya frontend memanggil `/api/*` di
  origin yang sama, lalu diteruskan redirect ke Netlify Function.
- `VITE_CHAIN_ID`, `VITE_RPC_URL`, alamat Uniswap V3 dan token — dipakai
  `src/config/network.ts`. Kalau salah satu hilang, UI menampilkan status
  "chain belum dikonfigurasi".

Untuk mengubah nilainya tanpa commit, isi di **Site configuration →
Environment variables**. Nilai dari dashboard menang atas `netlify.toml`.

Untuk development lokal, salin contohnya:

```bash
cp artifacts/delta-lp/.env.example artifacts/delta-lp/.env
pnpm install
pnpm --filter @workspace/liqora run dev
```

## Routing

```
/api/*  → /.netlify/functions/api/:splat   (status 200, force)
/*      → /index.html                      (status 200, SPA fallback)
```

Urutannya penting: aturan `/api/*` harus berada di atas SPA fallback, kalau
tidak semua request API akan dibalas `index.html`.

## Endpoint API yang tersedia

Semuanya dilayani `netlify/functions/api.mjs`, tanpa dependency eksternal:

- `GET /api/market/prices`
- `GET /api/chain/positions/:address`
- `GET /api/keeper/status` — selalu `configured: false` di Netlify
- `POST /api/chain/simulate-mint`

## Keeper automation

Keeper tetap nonaktif di Netlify. `KEEPER_PRIVATE_KEY` dan `SESSION_SECRET`
tidak boleh disimpan di Netlify Functions; jalankan `artifacts/api-server` di
host terpisah (Fly.io, Railway, VPS) dan arahkan `VITE_API_BASE_URL` ke sana
jika suatu saat keeper diaktifkan.

## Troubleshooting

| Gejala | Penyebab & solusi |
| --- | --- |
| `PORT environment variable is required` | `PORT` terhapus dari `[build.environment]`. Kembalikan. |
| Halaman putih, asset 404 | `BASE_PATH` bukan `/`. Untuk domain root harus `/`. |
| `Use pnpm instead` saat install | Netlify memakai npm. Pastikan `pnpm-lock.yaml` ter-commit dan `packageManager` ada di `package.json` root. |
| `/api/*` mengembalikan HTML | Urutan redirect tertukar; `/api/*` harus lebih dulu. |
| UI bilang chain belum dikonfigurasi | Variabel `VITE_*` hilang saat build. Cek deploy log bagian environment. |
| `Cannot find module '@rollup/rollup-*'` | Build dijalankan di OS non-Linux. Lihat catatan di atas. |
