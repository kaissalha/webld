# AGENTS.md

## Rules

- Always check for relevant skills before responding.
- Always use context7 when I need code generation, setup steps, or library documentation.
- Automatically use Context7 MCP tools without me having to ask.
- Always use Mobbin MCP to fetch similar screens for designs inspirations.
- Always check for relevant skills.
- Always read emil-design-eng and emil-design-engineering when working when working on the ui design.
- Always run `bun typecheck`, `bun lint`, and `bun react-doctor` at the end to verify everything is correct
- When running tests, use `bun run test` instead of `bun test` to run the tests using vitest instead of bun test runner.
- Treat `react-doctor` warnings in touched files as real cleanup signals, not optional polish. Fix them when the change is in scope.
- Keep shared components global only when they have multiple real consumers. If a component is route-owned, colocate it next to the route instead of leaving it in a global folder.
- When a file starts coordinating multiple dialogs, mutations, query-param selections, or more than a couple related `useState` values, extract an adjacent controller/custom hook before adding more state.
- Prefer reducer/controller hooks for related UI state transitions over piling on sibling `useState` calls.
- Prefer keyed child form components over `useEffect` state resets when local form state is seeded from fetched props.
- Do not trim textarea or input values on every keystroke. Keep raw user input in state and trim only when validating or submitting.
- Prefer `useEffectEvent` over `useRef` for latest callback/latest prop patterns. Keep refs for DOM nodes, timers, media handles, object URLs, and other imperative integration points.
- If several refs only exist to coordinate scroll or other imperative UI syncing, extract that logic into an adjacent custom hook.
- Any component using `useSearchParams()` must be rendered under a `Suspense` boundary from the route/page.
- Avoid synchronous `setState` inside effects unless syncing with an external system is truly required. Prefer derived state, keyed remounts, reducers, event handlers, or deferred work.
- Prefer stable ids for React keys. Do not use array indexes when a stable value like `id`, `email`, or `code` exists.
- Prefer string constants over tiny helper functions that only return a storage key or other static string.
- Avoid defensive helper wrappers like `isRecord` unless they are truly necessary at a boundary. Prefer direct shape checks and simpler assumptions in app code.
- Keep all AI prompts, output schemas used directly by prompts, and prompt tests in `packages/ai`; application and server code should import them from `@webld/ai/prompts` instead of defining prompt strings inline.
- Keep prompt and model behavior evals in `packages/evals`; add or update a relevant eval whenever a production prompt is introduced or materially changed.
- Do not create generic nullable predicate helpers like `isDefined`, `isPresent`, or `isNonNull`. Use explicit local control flow, `flatMap`, or a narrow inline type predicate at the boundary that needs it.
- Do not create one-line named helpers that only wrap property access, a simple condition, a static string, or a single `map`/`filter` expression. Inline that code unless the helper has multiple real consumers and a domain name that improves readability.
- For repeated feature workflows such as PDF preview/download, query-param selection, or modal submission flows, extract adjacent reusable hooks instead of duplicating local state machines.
- Use the impeccable skills to ensure the design of high standard. Ensure it's adapted to our design patterns.
- Use the vercel-react-best-practices, vercel-composition-patterns, deslop, effect-best-practices, and effect-portable-patterns to ensure we have high quality code
- Use the emil-design-eng, emil-design-engineering, and animation-best-practices skills to add intuitive animations
- Use adjacent `use-*-controller.ts` or `use-*-form.ts` hooks for non-visual state logic when it makes a component shell easier to read.
- Keep page/layout/component files focused on rendering structure and wiring. Move mutation orchestration, dialog open/close flows, and query-state coordination into adjacent hooks.
- Do not create broad generic abstractions too early. Prefer feature-local reuse first, and only make something global after it proves it has multiple consumers.
- Prefer explicit variants or wrapper components over boolean mode props when behavior differs by route or product area.
- When a route file grows multiple local subcomponents, split them into adjacent files instead of stacking everything in one `page.tsx`.
- For client preferences or localStorage-backed settings, keep the storage writes in a small hook/controller and keep render components declarative.
- When reusing expensive or stateful child forms across changing server data, use a keyed boundary to reset them instead of an effect that copies props into state.
- We are using the latest React. Ensure you don't use forwardRef and utilize new functionalities like Activity and useEffectEvent.
- Always prefer async/await over .then and .catch

## Code Style

- Formatter: Oxfmt (tabs, double quotes, single JSX quotes, trailing commas ES5, 120 line width)
- Types: Use `type` over `interface`; use `import type` for type-only imports; prefix unused vars with `_`
- Functions: Arrow function expressions (`const fn = () => {}`)
- Exports: Named exports only; default exports allowed only for Next.js files (page, layout, etc.)
- Imports: Order = react → next → external (@) → internal (@/) → relative; use `@/` alias
- JSX: No string literals in JSX (use i18n via next-intl); allowed in tests
- Naming: camelCase functions/vars, PascalCase components/types, kebab-case files
- Never use barrel files (index.ts file that re-exports) except in packages
- Prefer early returns
- Don't use "any" type
- Prefer putting types in the same file instead of creating types.ts. Import them in other files over re-creating them.
- Always use the color tokens in packages/ui/src/globals.css
- Always use logical properties in css to support both LTR and RTL
- Always use i18n
- Don't explicitly type return values of functions.
- Prefer to use Array.map/filter/reduce over loops with push.
- Prefer to have implicit types over explicit types.
- Prefer to not use "as" type assertions.
- Prefer to always use objects for function parameters instead of individual parameters.
- Always inline exports over exporting at the bottom of the file.
- Don't create constants that are used only once
- Never create single line functions. Prefer to inline those operations.
- Prefer `{condition && <Component />}` over `{condition ? <Component /> : null}` unless the behavior actually needs a non-null false branch.
- Minimize illogical or over zealous fallbacks and assumptions.

## Commands

- `make env` - Link the Vercel project and pull `apps/webapp/.env.local`
- `make db` - Start the local Postgres container
- `make reset_db` - Recreate the local database and rerun migrations
- `bun dev` - Start dev server (uses turbo)
- `bun run test` - Run the Vitest suite
- `bun typecheck` - TypeScript check (uses tsgo in webapp)
- `bun lint` - Lint and format check with Oxlint + Oxfmt
- `bun run lint:fix` - Apply Oxlint fixes and format with Oxfmt
- `bun react-doctor` - Run React Doctor across the repo
- `bun eval:dev` - Run Evalite in watch mode
- `bun eval:ci` - Run Evalite once for CI-style verification
- `bun eval:export` - Export Evalite UI artifacts
- `make migrate` - Run Drizzle migrations
- `make studio` - Open Drizzle Studio

## Architecture

- **Monorepo**: Bun workspaces + Turborepo
- **apps/webapp**: Next.js 16 app (App Router, next-intl i18n, better-auth, tRPC, AI SDK)
  `src/app` holds routes and API handlers; `src/components` holds app-specific UI; `src/server`, `src/services`, and `src/workflows` hold domain logic and orchestration
- **packages/ai**: Shared AI models, prompt helpers, and AI SDK configuration
- **packages/app-store**: Third-party app integrations and OAuth-backed connectors (Gmail, Google Calendar)
- **packages/cache**: Redis/KV utilities and rate-limit helpers (Upstash + ioredis)
- **packages/db**: Drizzle ORM + PostgreSQL schema and migrations
- **packages/email**: React Email templates with Resend
- **packages/evals**: Evalite-based evaluation suite for prompts and AI behavior
- **packages/logger**: Shared logging and observability helpers for client/server usage
- **packages/pdf**: React PDF templates and document-generation helpers
- **packages/server**: Server-side services and lib integrations (AI agents/tools, auth, payments, Resend, Dub, AssemblyAI, tRPC)
- **packages/tsconfig**: Shared TypeScript configs (base, web, node, react-lib, react-native)
- **packages/ui**: Shared UI components, hooks, and global design tokens (Tailwind v4, CVA, Base UI/Radix)
- **packages/utils**: Shared utility functions (get-base-url)

## Relevant llms.txt

- turbo: https://turborepo.com/llms.txt
- next: https://nextjs.org/docs/llms.txt
- aisdk: https://ai-sdk.dev/llms.txt
- betterauth: https://www.better-auth.com/llms.txt
- baseui: https://base-ui.com/llms.txt
- cossui: https://coss.com/ui/llms.txt
- trpc: https://trpc.io/llms.txt
- tanstack query: https://tanstack.com/llms.txt
- drizzle ORM: https://orm.drizzle.team/llms.txt
- flags sdk: https://flags-sdk.dev/llms.txt
- dub: https://dub.co/docs/llms.txt
- workflow: https://useworkflow.dev/llms.txt
- posthog: https://posthog.com/llms.txt
- zod: https://zod.dev/llms.txt
- upstash: https://upstash.com/docs/llms.txt
- assemblyai: https://www.assemblyai.com/docs/llms.txt
