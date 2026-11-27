# AutoForward v2.2 Beta

> **Untested in long run** <br>
> v2.2b is in _beta_, long term & continuous process are currently being tested.
> Please refer to a _stable_ version in different branch.

WhatsApp AI Bot that watches your chats, runs each message through rules you define, and routes what matters: forwarded, summarized, or skipped, automatically.

- **AI-Powered Message Analysis**: OpenAI-compatible models route messages intelligently
- **Web UI Control**: manage routes, rules, and logs from the browser
- **Complete Media Support**: forwards images, videos, and documents
- **Many-to-Many Rule System**: reusable rules across multiple forward routes
- **Batch Processing**: configurable cron interval
- **Auto-Cleanup**: automatic message retention with configurable TTL

### How the AI works

Each forward route can have rules attached, plain-text instructions that tell the AI what to do. Every batch cycle, the AI reads pending messages against those rules and decides:

| Action | What happens |
|--------|-------------|
| **Forward** | Send the original message as-is |
| **Summarize** | Condense multiple messages into one |
| **Rewrite** | Send something entirely different based on the content |
| **Skip** | Incomplete context (e.g. unanswered question), hold for next batch |
| **Drop** | Spam or irrelevant, mark as sent without forwarding |

The AI can handle fragmentation (merging related short messages) and adapts based on volume (prefers summaries when 3+ messages pile up).
> ---
> **You control everything through rules.**
> ---
> - No rules = plain forward. 
> - Add a one-liner = light filter. 
> - Write a detailed rule = full editorial control over what gets sent and how.
>  ---
## Major Changes
- Full app control from Web UI
- Notify admin on error
- logging massively improved across the app

## Patch & Bug Fix
- added LLM path exfiltration guardrail
- path traversal issue fixed
---

## Installation

Two ways to run it. Docker brings up everything (database, bot, watchdog, dashboard) in one command.

The stack is four containers:

| Container | Role | Port |
|-----------|------|------|
| `autoforward-mysql` | MySQL 8 database | internal |
| `autoforward-bot` | WhatsApp client + AI + internal API | `3001` |
| `autoforward-watchdog` | Start/stop/restart the bot, stream logs | `3002` |
| `autoforward-dashboard` | nginx serving the built web UI | `8080` |

The watchdog and web interface stays up even when the bot is down, this allow the user to turn the bot online effortlessly.

### Docker Setup (Recommended)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd autoforward
   ```

2. **Create the environment file**
   ```bash
   cp .env.example .env
   ```

3. **Fill in `.env`.**
   ```bash
   # Your WhatsApp number, digits only (no + or country code)
   ADMIN_NUMBER=628123456789

   # OpenAI-compatible model provider
   OPENAI_API_KEY=sk-your-key
   OPENAI_BASE_URL=http://host.docker.internal:20128/v1
   AI_MODEL_NAME=ambatukam-6.7-max

   # MySQL
   DATABASE_USER=autoforward
   DATABASE_PASSWORD=change-me
   DATABASE_NAME=autoforward
   DATABASE_URL="mysql://autoforward:change-me@mysql:3306/autoforward"
   ```
   > Running the model server on your host (LM Studio, Ollama, 9router, etc.)? Point `OPENAI_BASE_URL` at `host.docker.internal`, not `localhost`, or the container cannot see it.

4. **Build the dashboard.** The nginx container serves `web/dist`, so it has to exist first:
   ```bash
   cd web
   npm install
   npm run build
   cd ..
   ```

5. **Start everything**
   ```bash
   docker compose up -d --build
   ```

6. **Open the dashboard** at [http://localhost:8080](http://localhost:8080) and scan the QR code shown there. It is also printed in the bot logs:
   ```bash
   docker logs autoforward-bot -f
   ```

   Wait for `WhatsApp Connection Ready`. From the dashboard you can add forwards, write rules, watch logs, and start/stop the bot.

Rebuilt the web UI later? Just run `npm run build` again in `web/` and refresh the browser. The `dist` folder is bind-mounted, so no container restart is needed.

### Local Development Setup

1. **Prerequisites**
   - Node.js 22+
   - MySQL 8.0+
   - npm

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Point `.env` at your local database**
   ```bash
   DATABASE_HOST=localhost
   DATABASE_PORT=3306
   DATABASE_USER=autoforward
   DATABASE_PASSWORD=your_password
   DATABASE_NAME=autoforward
   DATABASE_URL="mysql://autoforward:your_password@localhost:3306/autoforward"
   ```

4. **Apply database migrations**
   ```bash
   npx prisma generate
   npx prisma migrate deploy
   ```

5. **Start the bot**
   ```bash
   npm run dev
   ```

6. **Start the dashboard** (separate terminal, hot-reloads at http://localhost:5173)
   ```bash
   cd web
   npm install
   npm run dev
   ```

The watchdog is optional in local dev: it drives the Docker containers, so it only matters when the bot runs containerized. To run it anyway:
```bash
npx tsx watchdog/index.ts
```

---

## Configuration

All settings live in `.env`. Docker reads it via `env_file`, local dev loads it with `dotenv`.

### Environment Variables

**Core**

| Variable | Required | Description |
|----------|----------|-------------|
| `ADMIN_NUMBER` | Yes | Your WhatsApp number, digits only. Used for error alerts and bot identification |
| `OPENAI_API_KEY` | Yes | API key for the OpenAI-compatible service |
| `OPENAI_BASE_URL` | Yes | Base URL of the model provider (`.../v1`) |
| `AI_MODEL_NAME` | Yes | Model used to classify and rewrite messages |

**Database**

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_USER` | Yes | MySQL user |
| `DATABASE_PASSWORD` | Yes | MySQL password |
| `DATABASE_NAME` | Yes | MySQL database name |
| `DATABASE_HOST` | Yes | Database host: `mysql` in Docker, `localhost` for local dev |
| `DATABASE_PORT` | No | Database port |
| `DATABASE_URL` | Yes | Full connection string, used by Prisma migrations |

**Batch and storage**

| Variable | Required | Description |
|----------|----------|-------------|
| `BATCH_FORWARD_INTERVAL_MINUTES` | No | How often pending messages are processed (1-59) |
| `CLEANUP_RETENTION_DAYS` | No | Days before sent messages and media are deleted (min 1) |
| `STORAGE_DIR` | No | Where downloaded media is written |
| `AUTH_STATE_DIR` | No | Where WhatsApp session credentials are stored |
| `CACHE_TTL_SECONDS` | No | TTL for cached group metadata |
| `GROUP_CACHE_TTL_SECONDS` | No | TTL for the Baileys socket group cache |

**Services**

| Variable | Required | Description |
|----------|----------|-------------|
| `INTERNAL_HTTP_PORT` | No | Bot internal API the dashboard calls |
| `WATCHDOG_HTTP_PORT` | No | Watchdog API (lifecycle + logs) |
| `DASHBOARD_PORT` | No | Host port for the dashboard container |
| `BOT_CONTAINER_NAME` | No | Container the watchdog supervises |
| `DEBUG` | No | `true` enables verbose debug logs in console and dashboard |

Defaults for optional variables are documented in `.env.example`.

> `INTERNAL_HTTP_PORT` and `VITE_BOT_URL` must point at the same port, and so must `WATCHDOG_HTTP_PORT` and `VITE_WATCHDOG_URL`. A mismatch does not crash anything, but the dashboard shows the bot as offline because the browser is calling a port nothing listens on. Compose also publishes `${PORT}:${PORT}`, so the two port variables must also differ from each other.

### Docker vs Local Database Host

The only value that changes between the two is the database host:

**Docker** uses the compose service name `mysql`:
```bash
DATABASE_HOST=mysql
DATABASE_URL="mysql://autoforward:password@mysql:3306/autoforward"
```

**Local** uses `localhost` (or your MySQL server IP):
```bash
DATABASE_HOST=localhost
DATABASE_URL="mysql://autoforward:password@localhost:3306/autoforward"
```

---

## Next Fix & Update
- Cleanup saved files
- Rewrite message handler to return the processed message IDs, not just the processed count for error handling
- Introduce message uniqueness using msg.key.id to prevent duplicate chat
- add cron run state so cron cannot run when its still running
- Adding sent chat history for model context
- File & folder structure refactor

## License

Released under the [MIT License](LICENSE).

You are free to use, modify, and distribute this software, including commercially, as long as the copyright notice and license text are preserved. The software comes with no warranty.
