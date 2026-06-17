---
name: ai-evals
description: 'Write and run evals for AI features on the starter stack using Evalite (packages/evals). Use whenever the user wants to test/measure/benchmark prompts, agents, tool selection, or LLM output quality - "is this prompt good?", "did the model pick the right tool?", "A/B test these models", "how do I know my memory extraction works?", "add an eval", "score the output", regression testing prompts, deterministic vs LLM-as-judge scorers. ALWAYS use this skill when introducing or materially changing a production prompt (the repo requires a matching eval), and whenever someone asks how to evaluate AI behavior.'
---

# AI Evals (Evalite, starter stack)

Evals turn "looks fine" into a number you can track. This repo evaluates with **Evalite** in [packages/evals](../../../packages/evals). Read the existing evals before writing new ones - copy their shape:

- [packages/evals/evals/chat-title.eval.ts](../../../packages/evals/evals/chat-title.eval.ts) - deterministic + keyword scorers with `createScorer`.
- [packages/evals/evals/rag-answer.eval.ts](../../../packages/evals/evals/rag-answer.eval.ts) - prompt-coverage scorer.
- [packages/evals/evals/utils.ts](../../../packages/evals/evals/utils.ts) - shared scoring helpers.

Run with `bun eval:dev` (watch) or `bun eval:ci` (once). Per AGENTS.md: keep prompts in `@webld/ai/prompts` and add/update an eval whenever a production prompt is introduced or materially changed.

## Anatomy of an eval

```ts
import { createScorer, evalite } from "evalite";

evalite<Input, Output, Expected>("Name of what you're testing", {
  data: [{ input: {/* ... */}, expected: {/* ... */} }],
  task: async (input) => {/* run the prompt/agent, return Output */},
  scorers: [/* createScorer(...) instances */],
});
```

- `data` - the dataset: each row has `input` and (usually) `expected`.
- `task` - runs the thing under test and returns the output to grade. Import the **real** production prompt/agent from `@webld/ai` / `@webld/server` so the eval tracks production, not a copy.
- `scorers` - graders returning a number in `[0, 1]` (1 = pass).

Type the eval `evalite<Input, Output, Expected>` so scorers are type-safe.

## Choose the right scorer

Pick the cheapest scorer that captures what you care about. Escalate only when needed.

1. **Deterministic** (free, instant, no flake) - exact/regex/count/keyword checks. Use for tool selection, output format, word budget, presence of required phrases. Most evals should be mostly deterministic.
2. **Embedding similarity** (`answerSimilarity` from `evalite/scorers`) - "is the output semantically close to a reference string?" No LLM judge, fast, good default for free-text output.
3. **LLM-as-judge** (`answerCorrectness` from `evalite/scorers`) - semantic + a judge model framed by a `question`. Use when correctness is nuanced and a reference string isn't enough. Slowest/most expensive; use sparingly.

Built-in semantic scorers live in `evalite/scorers` (`answerSimilarity`, `answerCorrectness`), not the `autoevals` package.

## Deterministic scorer pattern

```ts
const wordBudgetScorer = createScorer<Input, string, Expected>({
  name: "2-6 word title",
  scorer: ({ output }) => (countWords(output) >= 2 && countWords(output) <= 6 ? 1 : 0),
});
```

The scorer receives `{ input, output, expected }`. Give it a clear `name` - it shows up in the Evalite UI, so it should read like an assertion.

## Evaluating tool selection (agents)

To check the agent picks the right tool without executing side effects, run it with `stepCountIs(1)` so tools are **selected but not executed**, then score the tool calls:

```ts
task: async (messages) => {
  const result = someAgent.stream({ messages: convertToModelMessages(messages) /* stopWhen: stepCountIs(1) */ });
  await result.consumeStream();
  return { toolCalls: (await result.toolCalls).map((t) => ({ toolName: t.toolName, input: t.input })) };
},
scorers: [createScorer({
  name: "Called expected tool",
  scorer: ({ output, expected }) => output.toolCalls.some((t) => t.toolName === expected.tool) ? 1 : 0,
})],
```

Include **adversarial rows** where no tool should fire (`expected: { tool: null }`) and score `output.toolCalls.length === 0`. An agent that always calls a tool is as broken as one that never does.

## A/B testing models or prompts

Use `evalite.each([...])` to run the same dataset + scorers across variants (e.g. `models.fast` vs `models.rerank`) to pick the cheapest variant that hits your accuracy bar:

```ts
evalite.each([
  { name: "Flash", input: models.fast.model },
  { name: "Flash Lite", input: models.rerank.model },
])("Tool selection", { data, task: async (input, model) => {/* use model */}, scorers });
```

The variant is the **second argument** to `task`.

## Make production code eval-testable

Evals should call production logic, not reimplement it. If a function does AI + DB I/O, extract a pure "inner" function that takes the `model` and returns the structured result, so `task` can call it without side effects (e.g. `extractMemoriesInner({ messages, memories, model })`). Keep the prompt/schema in `@webld/ai/prompts` and import it in both production and the eval.

## Clarifying-questions / "should it ask?" evals

For agents that should ask before guessing, give the agent an `askForClarification` tool and write a dataset of ambiguous prompts; score whether it called `askForClarification` (and well-specified prompts where it should NOT). This is just tool-selection scoring applied to the clarification tool.

## Common pitfalls

- Reimplementing the prompt in the eval - import the real one so the eval guards production.
- Only LLM-judge scorers - slow, flaky, expensive; prefer deterministic, escalate deliberately.
- No negative/adversarial cases - you won't catch over-triggering.
- Scorers returning booleans/percentages - return a number in `[0, 1]`.
- Executing real side effects in `task` - use `stepCountIs(1)` for selection, or a pure inner function.

## Detailed reference

For the full cohort progression (Evalite harness, deterministic tool scorer, adversarial null-tool, `evalite.each`, clarifying tool, and the memory-extraction scorer progression deterministic -> answerCorrectness -> answerSimilarity) with real code, see [references/techniques.md](references/techniques.md).
