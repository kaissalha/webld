# Retrieval techniques (detailed reference)

Source: cohort exercises `01-retrieval-skill-building` through `04-retrieval-day-2-project-work`, adapted to the starter stack (AI SDK v6, Drizzle, pgvector, Postgres FTS).

## Table of contents

1. BM25 / keyword search
2. Embeddings semantic search
3. Reciprocal Rank Fusion
4. Hybrid search
5. Query rewriting
6. Chunking (fixed-size and structural)
7. Reranking
8. Conversation-aware reranking
9. Search tool + context engineering
10. Metadata-first retrieval

## 1. BM25 / keyword search

Cohort uses `okapibm25` over an in-memory corpus (`subject + body`, lowercased keywords). It scores by term frequency, inverse document frequency, and length normalization. Strong for exact terms, weak for synonyms.

In the starter, prefer Postgres FTS (indexed, no memory load):

```ts
const tsquery = buildSearchQuery(query); // from @webld/db -> "term:* & other:*"
const rank = sql<number>`ts_rank(${ragDocumentChunks.fts}, to_tsquery('english', ${tsquery}))`;
// WHERE ${ragDocumentChunks.fts} @@ to_tsquery('english', ${tsquery})
```

## 2. Embeddings semantic search

Embed once, cache (cohort caches to JSON by content hash; the starter persists vectors in pgvector). Score with cosine similarity. Use one model for write + read.

```ts
const similarity = sql<number>`1 - (${cosineDistance(ragDocumentChunks.embedding, queryEmbedding)})`;
```

Cohort cache key pattern: `sha256(content)` to dedupe re-embedding; batch `embedMany` at 99 values.

## 3. Reciprocal Rank Fusion

```ts
const RRF_K = 60;
// per list: contribution = 1 / (RRF_K + rank)   // rank 0-indexed
// sum contributions per item id across lists, sort desc
```

Generic form takes `toId(item)` so the same function fuses chunks (`${docId}-${chunkIndex}` or chunkId), memories, emails, etc.

## 4. Hybrid search

Run keyword + semantic independently, slice each to top ~30, fuse with RRF. Order of lists does not matter (rank-based). Same query string can feed both, or split (keywords vs natural language).

## 5. Query rewriting

`generateObject` with schema `{ keywords: string[], searchQuery: string }`:
- `keywords`: exact terminology for keyword search.
- `searchQuery`: broader natural-language string for semantic search.

For agents, expose these as tool params instead and let the model fill them per call.

## 6. Chunking

Fixed-size (cohort 03.02): `TokenTextSplitter({ chunkSize: 500, chunkOverlap: 200 })`.

Structural (cohort 03.03): `RecursiveCharacterTextSplitter` with separator priority (chapter -> headings -> code fences -> paragraphs -> `\n` -> ` `), `chunkSize: 2000`, `chunkOverlap: 200`. Coherent chunks retrieve better.

Email/body chunking (cohort 04.01): `RecursiveCharacterTextSplitter({ chunkSize: 1000, chunkOverlap: 100, separators: ["\n\n","\n"," ",""] })`, storing `{ id, index, totalChunks, ... }` per chunk.

The starter's `chunkRagText` is a hand-rolled structural splitter (separators, heading extraction, chunk-type detection) - reuse it.

## 7. Reranking

Retrieve ~30, rerank with a cheap model (cohort: `gemini-2.5-flash-lite`; starter: `models.rerank`). Prompt includes the query and candidate chunks each prefixed with a numeric index; the model returns `resultIds: number[]` (kept indices, ordered). Constants: `NUMBER_PASSED_TO_RERANKER = 30`.

```ts
schema: z.object({ resultIds: z.array(z.number()) })
// reorder: map resultIds -> candidates; fall back to fused order if empty/error
```

## 8. Conversation-aware reranking

Pass `user`/`assistant` turns (no tool calls) as `messages` before the rerank instruction so follow-up questions resolve. Cohort made the search tool a factory `searchTool(messages)`; the starter threads history through `appContextSchema.conversationHistory`.

## 9. Search tool + context engineering

Expose hybrid search as a tool the agent calls. System prompt should:
- Require tool use for any question about the knowledge base (never answer from training data).
- Tell the agent to pass both `keywords` and `searchQuery`.
- Encourage retrying with different terms when results are weak.
- Cap agent loops (`stopWhen: stepCountIs(...)`).

## 10. Metadata-first retrieval

Search returns metadata + ~150-char snippets + IDs; a second tool fetches full content by ID (optionally expanding to neighbor chunks). Mirrors Google snippets -> click. Big token savings on large corpora. System prompt encodes: search -> review snippets -> getContent(ids) -> answer + cite.
