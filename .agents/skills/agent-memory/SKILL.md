---
name: agent-memory
description: 'Give AI agents long-term memory on the starter stack (AI SDK v6, Drizzle + pgvector, ToolLoopAgent, Next.js chat route). Use whenever the user wants the assistant to "remember" things across turns or chats - user facts/preferences, infinite-length conversations, learning from past chats, personalization, "the bot forgets what I told it", working memory, semantic memory, episodic memory, memory extraction, or recalling past conversations. Also use when onboarding or other flows need to seed durable memories.'
---

# Agent Memory (starter stack)

Three complementary memory types, each solving a different problem. The canonical implementation already exists in this repo - read it before writing new code:

- Service: [packages/server/src/services/memory.ts](../../../packages/server/src/services/memory.ts) - text utils, semantic, working, episodic.
- Schema: [memory.ts](../../../packages/db/src/schema/ai/memory.ts) (`memories` + `memorySource`), [episode.ts](../../../packages/db/src/schema/ai/episode.ts) (`chatEpisodes`), and the `embedding` column on [message.ts](../../../packages/db/src/schema/ai/message.ts).
- Prompts: `memoryExtractionSystemPrompt`/`Schema`, `chatReflectionSystemPrompt`/`Schema`, `memoryContextPrompt` in [packages/ai/src/prompts.ts](../../../packages/ai/src/prompts.ts).
- Wiring: [apps/webapp/src/app/api/chat/route.ts](../../../apps/webapp/src/app/api/chat/route.ts) (windowing, recall injection, `onFinish` writes).

All memory in this repo is **organization-scoped** (matches `ai_chats`, `rag_documents`). Keep every read/write filtered by `organizationId`.

## The three memory types

| Type | Question it answers | Storage | Recall |
|------|--------------------|---------|--------|
| **Semantic** | "What durable facts do I know about this user/org?" | `memories` (title, content, embedding, source) | vector search over memories, inject into system prompt |
| **Working** | "How do I keep a long conversation in budget?" | per-message `embedding` on `ai_chat_messages` | recent window + vector search over older messages of the same chat |
| **Episodic** | "What did I learn from past conversations?" | `chat_episodes` (summary, tags, what worked/avoid, embedding) | vector search over other chats' episodes, inject into prompt |

Build them in this order of value: semantic -> working -> episodic. Reuse the RAG embedding helpers (`generateRagEmbedding`) and pgvector cosine search - memory is retrieval over a different corpus.

## Read path (in the chat route, before streaming)

1. Load chat history, split into a **recent window** (last ~10 messages) and **older messages**.
2. In parallel, key off the recent messages:
   - `searchOlderMessages` (working) - vector search restricted to this chat, excluding the recent window.
   - `searchMemories` (semantic) - vector search over `memories`.
   - `searchRelatedChats` (episodic) - vector search over other chats' episodes.
3. Build `messageHistoryForLLM = [...relevantOlderMessages, ...recentMessages]`.
4. Prepend a single system message built from `memoryContextPrompt({ memories, relatedChats })`.

## Write path (in `onFinish`, via `after()` so it never blocks the stream)

1. Embed the new user + assistant messages (`embedChatMessage`) for future working-memory recall.
2. `extractAndUpdateMemories` - extract durable facts and reconcile (add/update/delete) against existing memories.
3. `reflectOnChat` - summarize the conversation into an episode (upsert by `chatId`).

## Semantic memory

Durable facts worth recalling for weeks/months (preferences, traits, who's who, how the user works). Store `{ title, content, embedding, source }`. The `source` enum (`chat`/`onboarding`/`manual`) lets non-chat flows (e.g. onboarding) write into the same table - reuse `createMemory({ source })`.

Recall: build a query from the recent messages (repeat the latest message to overweight it - see `messageHistoryToQuery`), embed, cosine search, take top ~3, inject.

Extraction: `generateObject` with a schema of `{ additions, updates, deletions }`. Pass existing memories (with IDs) so the model can update/delete, not just append. Filter conflicting deletions (don't delete an id you're also updating). Be conservative - only store lasting facts, never transient state ("user said hello").

## Working memory

Conversations grow unbounded; sending the whole history is slow and expensive. Instead, send a recent window plus the few older messages that are semantically relevant to the current turn. Store an embedding per message (nullable column, embedded in `after()`), then `searchOlderMessages` does a pgvector search scoped to the chat, excluding the recent window. Prepend the matches (chronologically) before the recent window.

## Episodic memory

Let the assistant learn from experience. After each chat, `reflectOnChat` runs a cheap `generateObject` producing `{ tags, summary, whatWorkedWell, whatToAvoid }`, embeds the summary, and upserts a `chat_episodes` row (unique per `chatId`). On a new chat, `searchRelatedChats` finds similar past episodes (excluding the current chat) and injects their summaries so the model reuses what worked and avoids past mistakes.

## Key patterns

- Reuse `generateRagEmbedding`/`generateRagEmbeddings` - don't add a second embedding model.
- Run all writes in `after()` - memory must never block or fail the user's stream; log errors like the title-generation flow.
- `messageHistoryToQuery` repeats the most recent message so recall is biased toward current intent.
- Inject recall as a leading **system** message, keeping the agent and its `appContextSchema` unchanged.
- Memory recall is complementary to RAG document retrieval (`retrieveKnowledge`), not a replacement.

## Common pitfalls

- Storing transient state as semantic memory - extraction must be conservative.
- Append-only extraction (no update/delete) - memories drift and contradict.
- Blocking the stream on extraction/reflection - always defer with `after()`.
- Forgetting `organizationId` scoping on any memory query.
- Reflecting on every turn when cost matters - consider gating (every N turns) if needed.

## Detailed reference

For the cohort's file-based reference implementation and prompts (memory extraction, chat reflection, related-chat search), see [references/techniques.md](references/techniques.md).
