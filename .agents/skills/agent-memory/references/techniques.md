# Memory techniques (detailed reference)

Source: cohort exercises `06-memory-project-work` (`06.01` semantic recall, `06.02` working memory, `06.03` episodic), adapted to the starter stack (Drizzle + pgvector instead of JSON files).

## Semantic memory (06.01)

Text utils:

```ts
messagePartsToText(parts) // join text parts only (skip tool calls)
messageToText(m)          // `${role}: ${text}`
messageHistoryToQuery(ms) // repeat the latest message to overweight it, then join
memoryToText(m)           // `${title}: ${content}`
```

`searchMemories({ messages, organizationId, topK })`: build query via `messageHistoryToQuery`, embed, cosine search over memories, return top K.

`extractAndUpdateMemories({ chatId, messages, organizationId })`:
- Filter to user/assistant messages.
- `generateObject` with schema:

```ts
z.object({
  updates: z.array(z.object({ id, title, content })),
  deletions: z.array(z.string()),
  additions: z.array(z.object({ title, content })),
})
```

- System prompt lists existing memories as `<memory id="...">title: content</memory>` and instructs the model to store only PERMANENT facts (preferences, traits, lasting context), never transient state.
- Apply: filter deletions that collide with updates, then run updates/deletions/additions (additions tagged `source: "chat"`, `sourceChatId`).

Injection: a `<memories>` block in the system prompt listing recalled memories with IDs.

## Working memory (06.02)

Client sends only the latest message; the server loads full history from the DB and windows it:

```ts
const recentMessages = all.slice(-MESSAGE_WINDOW);     // ~10
const olderMessages  = all.slice(0, -MESSAGE_WINDOW);
```

`searchMessages` / `searchOlderMessages`: embed `messageHistoryToQuery(recentMessages)`, vector search older messages of the same chat, take top ~10, sort, prepend:

```ts
const messageHistoryForLLM = [...oldMessagesToUse, ...recentMessages];
```

Starter difference: per-message embeddings live in a nullable `embedding` column on `ai_chat_messages`, embedded in `after()`; search is a pgvector query scoped to `chatId` excluding the recent window.

## Episodic memory (06.03)

Reflection schema:

```ts
z.object({
  tags: z.array(z.string()),       // 2-4 specific keywords
  summary: z.string(),             // one sentence on what was accomplished
  whatWorkedWell: z.string(),
  whatToAvoid: z.string(),
})
```

`reflectOnChat(chatId)`: load chat + messages, `generateObject` (cheap model) with the reflection prompt over `chatToText(chat)`, store the result. Starter: embed the summary and upsert a `chat_episodes` row keyed by `chatId`.

`searchForRelatedChats` / `searchRelatedChats(currentChatId, messages)`: embed `messageHistoryToQuery(messages)`, vector search over other chats' episodes (exclude current), take top ~3.

Injection: a `<related-chats>` block in the system prompt with each episode's summary / what worked / what to avoid.

`chatToText(chat)`: title + optional episode summary + all messages joined - the input to reflection.

## Integration order in the chat route

1. Split recent vs older.
2. Parallel recall: working (older messages), semantic (memories), episodic (related chats).
3. Build combined history; prepend `memoryContextPrompt` system message.
4. `onFinish` -> `after()`: embed messages, extract memories, reflect on chat.
