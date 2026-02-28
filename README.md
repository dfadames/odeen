# Odeen

Secure, anonymous, self-hosted voting system for university assembly logistics.

## Tech Stack

- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Backend**: Go + Gin
- **Database**: PostgreSQL 16
- **Deployment**: Docker Compose + Cloudflare Tunnels

## Local Setup

```bash
git clone https://github.com/dfadames/odeen.git
cd odeen
docker compose up --build
```

- Frontend: http://localhost:3000
- Backend health: http://localhost:8080/health
- Database: localhost:5432

## Deployment

Expose with [Cloudflare Tunnels](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/) — no open inbound ports needed.

```bash
cloudflared tunnel login
cloudflared tunnel create odeen
cloudflared tunnel run odeen
```

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

[MIT](./LICENSE)

