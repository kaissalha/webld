# Eval techniques (detailed reference)

Source: cohort exercises `07-evals-skill-building` and `08-evals-project-work`. Cohort used `ai@5` + `evalite@1.0.0-beta`; the starter uses `ai@6` + `evalite` beta with `createScorer`. Built-in semantic scorers come from `evalite/scorers` (not `autoevals`).

## 1. Evalite harness

```ts
import { evalite } from "evalite";
// optional tracing: import { wrapAISDKModel } from "evalite/ai-sdk";

evalite("Agent Tool Call Evaluation", {
  data: [{ input: createUIMessageFixture("What is the weather in SF?") }],
  task: async (messages) => {
    const result = runAgent(model, messages, stepCountIs(1));
    await result.consumeStream();
    return { toolCalls: (await result.toolCalls).map((t) => ({ toolName: t.toolName, input: t.input })), text: await result.text };
  },
  scorers: [],
});
```

Cohort run loop (`main.ts`): `runEvalite({ mode: "watch-for-file-changes", cwd: import.meta.dirname, storage: createInMemoryStorage() })`, UI at `localhost:3006`. Starter: `bun eval:dev` / `bun eval:ci`.

Fixture helper (cohort `shared/create-ui-message-fixture.ts`): turns alternating strings into `UIMessage[]` (user/assistant by index).

## 2. Deterministic tool-call scorer (07.02)

```ts
{
  name: "Matches Expected Tool",
  scorer: ({ output, expected }) =>
    output.toolCalls.some((tc) => tc.toolName === expected?.tool) ? 1 : 0,
}
```

Data rows carry `expected: { tool: "checkWeather" }`. Scorer receives `{ output, expected }`, returns `1 | 0`.

## 3. Adversarial / null-expected (07.04)

```ts
scorer: ({ output, expected }) => {
  if (expected?.tool === null) return output.toolCalls.length === 0 ? 1 : 0;
  return output.toolCalls.some((tc) => tc.toolName === expected?.tool) ? 1 : 0;
}
```

## 4. A/B with evalite.each (07.03)

```ts
evalite.each([{ name: "GPT-4.1 Mini", input: openai("gpt-4.1-mini") }])(
  "Agent Tool Call Evaluation",
  { data, task: async (messages, model) => runAgent(model, messages, stepCountIs(1)) /* ... */, scorers },
);
```

Second arg to `task` is the variant. Add more variants to compare models/prompts on the same dataset + scorers.

## 5. Clarifying-questions tool (07.05)

Tool schema:

```ts
askForClarification: tool({
  description: "Ask the user clarifying questions when their request is missing critical information. Provide pre-filled options when possible.",
  inputSchema: z.object({
    questions: z.array(z.object({
      question: z.string(),
      field: z.string(),
      options: z.array(z.string()),
    })),
  }),
  execute: async ({ questions }) => "askForClarification tool called",
})
```

System prompt: instruct the model to call `askForClarification` only when critical info is missing, with worked JSON examples, and "Do NOT ask if the request already contains all necessary information." Eval: dataset of ambiguous prompts, scorer checks `output.toolCalls.some((tc) => tc.toolName === "askForClarification")`. Run with `evalite.each` across models.

## 6. Testable extraction (08.01 diff 01)

Extract a pure inner fn with injectable model so evals avoid DB I/O:

```ts
export const extractMemoriesInner = async (opts: { messages, memories, model }) => {
  const { object } = await generateObject({ model: opts.model, schema, system, messages: convertToModelMessages(filtered) });
  return object; // { updates, deletions, additions }
};
```

## 7. Scorer progression (08.01 diffs 03-06)

Deterministic counts first:

```ts
{ name: "Additions", scorer: ({ output }) => output.additions.length === 1 ? 1 : 0 }
```

Then LLM-as-judge `answerCorrectness`:

```ts
import { answerCorrectness } from "evalite/scorers";
{
  name: "Addition Faithfulness",
  scorer: ({ output, expected }) => {
    if (expected === null) return output.additions.length === 0 ? 1 : 0;
    return answerCorrectness({
      answer: output.additions.map((a) => `${a.title}: ${a.content}`).join("\n"),
      reference: expected,
      model: judgeModel,
      embeddingModel,
      question: "Is the addition faithful to the conversation and expected additions? Only permanent memories are expected.",
    });
  },
}
```

Then cheaper embedding-only `answerSimilarity`:

```ts
import { answerSimilarity } from "evalite/scorers";
{
  name: "Addition Similarity",
  scorer: ({ output, expected }) => {
    if (expected === null) return output.additions.length === 0 ? 1 : 0;
    return answerSimilarity({
      answer: output.additions.map((a) => `${a.title}: ${a.content}`).join("\n"),
      reference: expected,
      embeddingModel,
    });
  },
}
```

Progression: deterministic counts -> `answerCorrectness` (judge + embeddings) -> `answerSimilarity` (embeddings only). Pick the cheapest that's sensitive enough.

## Starter mapping

- Use `createScorer<Input, Output, Expected>({ name, scorer })` and `evalite<Input, Output, Expected>(...)` (see `chat-title.eval.ts`).
- Models from `@webld/ai/models` (`models.fast`, `models.rerank`); embedding model from `embeddingModels.rag`.
- Import production prompts/agents from `@webld/ai/prompts` and `@webld/server`.
- Scorers return numbers in `[0,1]`; shared helpers live in `packages/evals/evals/utils.ts`.
