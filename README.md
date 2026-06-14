# starter

This repo is a Bun workspaces + Turborepo monorepo centered around a Next.js 16 web app and shared packages for AI, auth, data, email, PDFs, logging, third-party API clients (e.g. Spoonacular), and platform integrations.

## Repo Layout

```text
.
|-- apps/
|   `-- webapp/              # Next.js app router app
|-- packages/
|   |-- ai/                  # Shared AI models, prompts, and helpers
|   |-- app-store/           # Third-party app integrations (Gmail, Google Calendar)
|   |-- cache/               # Redis and rate-limit utilities
|   |-- db/                  # Drizzle schema, migrations, and database access
|   |-- email/               # React Email templates and shared email components
|   |-- evals/               # Evalite-based evaluation suite
|   |-- logger/              # Shared client/server logging utilities
|   |-- pdf/                 # React PDF templates and helpers
|   |-- server/              # Shared server-side services, auth, AI tools, and tRPC helpers
|   |-- spoonacular/         # Vendored OpenAPI client for the Spoonacular food and nutrition API
|   |-- tsconfig/            # Shared TypeScript configs
|   |-- ui/                  # Shared UI primitives, hooks, and design tokens
|   `-- utils/               # Shared utilities
|-- Makefile                 # Env, database, and maintenance helpers
|-- docker-compose.yml       # Local Postgres service
|-- package.json             # Root scripts and workspace config
`-- turbo.json               # Turborepo task graph
```

## Package overview

| Package       | Role                                                     |
| ------------- | -------------------------------------------------------- |
| `ai`          | AI models, prompts, AI SDK configuration                 |
| `app-store`   | OAuth and connectors (e.g. Gmail, Google Calendar)       |
| `cache`       | Redis / KV and rate limits                               |
| `db`          | Drizzle schema, migrations, DB access                    |
| `email`       | React Email + Resend                                     |
| `evals`       | Evalite evals for prompts and model behavior             |
| `logger`      | Shared logging for client and server                     |
| `pdf`         | React PDF templates and helpers                          |
| `server`      | tRPC, auth, agents, integrations (Dub, AssemblyAI, etc.) |
| `spoonacular` | Vendored OpenAPI client for the Spoonacular API          |
| `tsconfig`    | Shared TypeScript bases                                  |
| `ui`          | Design system, Tailwind tokens, CVA, Base UI             |
| `utils`       | Shared utilities (e.g. base URL helpers)                 |

## Local Development Notes

- The root `bun dev` script runs Turborepo-managed dev tasks, including the web app and optional AI/Stripe helpers where configured.
- Local database development uses the Postgres service defined in `docker-compose.yml`.
- Most shared packages are imported into `apps/webapp`, so package-level changes are usually exercised from the web app.
