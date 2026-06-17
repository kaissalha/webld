---
name: rag-retrieval
description: 'Build and improve retrieval / RAG over the starter stack (AI SDK v6, Drizzle + pgvector + Postgres full-text search, ToolLoopAgent tools). Use whenever the user wants to add document search, knowledge-base lookup, semantic search, hybrid search, "search my docs/emails/contacts", embeddings retrieval, chunking, rank fusion, reranking, query rewriting, or a metadata-first retrieval tool - even if they only say "make the chatbot answer from our documents" or "our RAG results are bad". Also use when debugging weak/irrelevant retrieval results.'
---

# RAG Retrieval (starter stack)

This skill captures the retrieval techniques used in this repo. The canonical, working implementation already exists - read it before writing new code:

- Service: [packages/server/src/services/rag.ts](../../../packages/server/src/services/rag.ts) - chunking, embeddings, hybrid search, RRF, rerank, fetch-by-id/neighbors.
- Tools: [packages/server/src/ai/tools/retrieve-knowledge.ts](../../../packages/server/src/ai/tools/retrieve-knowledge.ts) and [get-knowledge-content.ts](../../../packages/server/src/ai/tools/get-knowledge-content.ts).
- Schema: [packages/db/src/schema/rag/document-chunks.ts](../../../packages/db/src/schema/rag/document-chunks.ts) (pgvector `embedding` + generated `fts` tsvector).
- Prompts: `ragRerankSystemPrompt`, `ragRerankSchema` in [packages/ai/src/prompts.ts](../../../packages/ai/src/prompts.ts).

When building something new, mirror these. When improving retrieval, find the missing stage in the pipeline below and add it.

## The pipeline (in order of impact)

A good RAG system is a pipeline. Add stages in this order; each one fixes a different failure mode.

1. **Chunk** documents into coherent, bounded passages.
2. **Embed + store** chunks once (cache by content), with a vector index.
3. **Retrieve hybrid**: semantic (vectors) + keyword (full-text) in parallel.
4. **Fuse** the two rankings with Reciprocal Rank Fusion (RRF).
5. **Rerank** the fused candidates with a cheap LLM, using conversation history.
6. **Return metadata + snippets**, and let the agent fetch full content on demand.
7. **Let the agent rewrite the query** into `keywords` + `searchQuery`.

If retrieval is "semantic-only", the highest-leverage upgrade is almost always adding keyword search + RRF (step 3-4), then reranking (step 5).

## Why hybrid beats semantic-only

Embeddings capture meaning but miss exact tokens (names, IDs, error codes, amounts, rare jargon). Keyword search nails exact tokens but misses paraphrase. Real queries need both. Run them independently and fuse - do not try to combine raw scores (cosine is 0-1, `ts_rank`/BM25 are unbounded and not comparable).

## Keyword search: use Postgres FTS, not in-memory BM25

The cohort uses `okapibm25` in JS, which requires loading every chunk into memory per query. In this repo, use Postgres full-text search instead - it scales and uses an index. Mirror the `contacts.fts` pattern: a generated `tsvector` column + GIN index.

```ts
// schema
fts: tsvector("fts")
  .notNull()
  .generatedAlwaysAs((): SQL => sql`to_tsvector('english'::regconfig, COALESCE(${table.content}, ''))`),
// index: .using("gin", table.fts.asc().nullsLast().op("tsvector_ops"))
```

Query with `ts_rank` and the existing `buildSearchQuery` helper from `@webld/db` (it produces a prefix `to_tsquery` like `term:*`). See `searchRagChunksByKeyword` in `rag.ts`.

## Semantic search

Embed the query with the same model used to embed chunks (`embeddingModels.rag`), then order by cosine distance against the pgvector `embedding` column (HNSW index). See `searchRagChunksBySemantic`. Keep the embedding model and dimensions identical on write and read paths, or similarities are meaningless.

## Reciprocal Rank Fusion (RRF)

RRF fuses ranked lists by **position**, not score: each list contributes `1 / (k + rank)` per item (`k = 60`, rank 0-indexed). Items ranked highly by both retrievers rise to the top. Keep it generic with a `toId` so it works for chunks, memories, or any entity:

```ts
reciprocalRankFusion({ rankings: [keywordResults, semanticResults], toId: (c) => c.chunkId });
```

Slice each retriever to ~30 candidates before fusing. See `reciprocalRankFusion` in `rag.ts`.

## Reranking (precision stage)

Retrieve broadly (recall), then have a cheap LLM drop noise and reorder (precision). Pass the **conversation history** so follow-ups ("what about the deposit?") resolve correctly. The reranker returns an array of candidate indices to keep, ordered; fall back to fused order on error/empty. See `rerankRagChunks` + `ragRerankSystemPrompt`. Use a lite model (`models.rerank`).

In this repo the conversation history reaches the tool via `appContextSchema.conversationHistory`, populated in the chat route and read from `experimental_context`.

## Metadata-first tool design

Returning full chunk bodies on every search wastes tokens. Split into two tools, like a search engine (snippets -> click -> full page):

- `retrieveKnowledge({ keywords?, searchQuery?, topK })` -> ranked **metadata + ~150-char snippets + chunk IDs** only.
- `getKnowledgeContent({ chunkIds, includeNeighbors? })` -> full chunk text (optionally the neighboring chunks for surrounding context).

The agent searches, reads snippets, then fetches only the chunks it needs. Encode this 3-step workflow in the system prompt (search -> review snippets -> fetch -> answer + cite).

## Query rewriting

BM25/FTS wants exact keywords; embeddings want a focused natural-language query. Don't pass raw chat history to either. Either (a) let the agent fill `keywords` + `searchQuery` tool params (preferred for agents - the model already has context), or (b) do a one-shot `generateObject` rewrite producing `{ keywords: string[], searchQuery: string }` before searching.

## Chunking

- Prefer **structural** chunking (split on headings/paragraphs) over fixed-size, so chunks stay coherent. See `chunkRagText` in `rag.ts` (recursive separators, ~2000 char target, ~200 overlap).
- Overlap preserves sentences cut at boundaries.
- Store `chunkIndex` + `documentId` so you can fetch neighbors.
- If you change chunk size/strategy, you must re-embed.

## Common pitfalls

- Combining cosine and keyword scores by raw value - use RRF instead.
- Re-embedding the corpus on every request instead of caching - embed once on write.
- Different embedding models on write vs read - similarities break silently.
- Returning full bodies from search - use snippets + a fetch tool.
- Skipping conversation history in the reranker - follow-up queries degrade.
- Org/tenant scoping dropped in a join - always filter every retrieval by `organizationId`.

## Detailed reference

For the full technique catalog with cohort code (BM25, embeddings cache, RRF variants, chunking configs, reranker prompts, metadata-first diffs), see [references/techniques.md](references/techniques.md).
