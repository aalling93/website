# Aalling93 Website

Full website with:
- Main landing page (same hero image style, with `Guest` + `Log In` top-right)
- Guest page
- Private portal page (requires local login)
- Hidden subsite at `/buenaeset` with:
  - Front page
  - Information page
  - Calendar page
  - Gallery page
  - Todo/Future projects page

## 1. Run locally

1. Start in project root:
   ```bash
   npm run create-user -- your_username
   ```
2. Create password when prompted.
3. Start website server:
   ```bash
   npm start
   ```
4. Open:
   - `http://localhost:8080/`
   - `http://localhost:8080/buenaeset`

## 2. Login architecture

- Login is **not GitHub auth**.
- Users are stored in `data/users.json` (ignored by git).
- Passwords are hashed with PBKDF2 (`sha512`, salted).
- Session cookie is local to this server.

## 3. Edit service links

Update private portal links in:
- `assets/js/portal.js`

## 4. Important hosting reality with your DNS/firewall setup

Given your current constraints:
- Dandomain is authoritative DNS for `aalling93.com`
- No subdomain NS delegation to Cloudflare
- Corporate firewall blocks inbound ports

You **cannot** directly expose a private server from your office PC as `https://git.aalling93.com` using Cloudflare Tunnel on this DNS setup.

## 5. Working deployment options

### Option A (recommended): Move DNS authority to Cloudflare

1. Move nameservers for `aalling93.com` to Cloudflare.
2. Run this site server on your local Ubuntu machine.
3. Run `cloudflared` tunnel from that machine to your local server (`localhost:8080`).
4. In Cloudflare DNS, point hostname to tunnel.

This gives end-to-end HTTPS on your own domain without opening inbound ports.

### Option B: Keep Dandomain DNS, add VPS relay

1. Rent a small VPS with public IP.
2. Point `aalling93.com` A record to VPS.
3. On VPS, run Nginx/Caddy with TLS.
4. Create persistent reverse tunnel from office machine to VPS (autossh / WireGuard tunnel).
5. Proxy domain traffic from VPS to local service over the tunnel.

This works without DNS transfer, but costs monthly VPS fee.

### Option C: Static-only on GitHub Pages

- Keep current A records to GitHub Pages.
- Main pages and `/buenaeset` static pages work.
- Private login cannot be truly secret unless backend runs somewhere else.

## 6. Route overview

- `/` -> main landing page
- `/guest.html` -> guest page
- `/login.html` -> login page
- `/portal.html` -> private portal (auth required)
- `/buenaeset` -> hidden rental subsite

