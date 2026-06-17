# Human-in-the-loop techniques (detailed reference)

On the starter (`ai@6`), prefer the **native `needsApproval` flow** below. The custom data-parts pattern (from cohort exercises `09-human-in-the-loop-skill-building` `09.02`-`09.06`, originally on `ai@5`) is a fallback for UX native parts can't express.

## Native `needsApproval` (recommended on `ai@6`)

Verify against `node_modules/ai/docs/03-ai-sdk-core/15-tools-and-tool-calling.mdx` and `.../04-ai-sdk-ui/03-chatbot-tool-usage.mdx`.

Server - gate the tool (real `execute` stays; it only runs after approval):

```ts
import { tool } from "ai";
import { z } from "zod";

export const sendEmailTool = tool({
  description: "Send an email",
  inputSchema: z.object({ to: z.string(), subject: z.string(), body: z.string() }),
  needsApproval: true, // or async ({ amount }) => amount > 1000
  execute: async (input, { experimental_context }) => sendEmail(input),
});
```

`ToolLoopAgent` pauses automatically when a tool needs approval - no `stopWhen` change.

Client (`useChat`) - render the `approval-requested` state and respond:

```tsx
const { addToolApprovalResponse } = useChat<BaseChatUIMessage>({
  sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses, // auto-resume after decision
});

if (part.type === "tool-sendEmail" && part.state === "approval-requested") {
  addToolApprovalResponse({ id: part.approval.id, approved: true, reason }); // reason optional, shown to model on denial
}
```

In the starter, `addToolApprovalResponse` is already exposed via the chat store (`useChatSession((s) => s.addToolApprovalResponse)`).

Core (non-`useChat`) - request appears as `tool-approval-request` in `result.content`; respond with a tool message:

```ts
import type { ToolApprovalResponse } from "ai";
const approvals: ToolApprovalResponse[] = result.content
  .filter((p) => p.type === "tool-approval-request")
  .map((p) => ({ type: "tool-approval-response", approvalId: p.approvalId, approved: true, reason }));
messages.push({ role: "tool", content: approvals });
```

Add a system instruction like "If a tool execution is not approved, do not retry it."

---

## Fallback: custom data parts (`ai@5`-era cohort pattern)

Use only when native parts can't express the UX (non-tool-scoped approvals, out-of-band approval, editable proposals, bespoke audit state).

### Custom data-part types

```ts
export type MyMessage = UIMessage<
  unknown,
  {
    "approval-request": { tool: ToolRequiringApproval };
    "approval-decision": { toolId: string; decision: ToolApprovalDecision };
    "approval-result": { output: ToolRequiringApprovalOutput; toolId: string };
  }
>;

export type ToolRequiringApproval = { id: string; type: "send-email"; content: string; to: string; subject: string };
export type ToolApprovalDecision = { type: "approve" } | { type: "reject"; reason: string };
```

Schema key `"approval-request"` becomes runtime part type `"data-approval-request"`.

## Defer the tool (09.02 / 09.04)

```ts
execute: ({ to, subject, content }) => {
  writer.write({
    type: "data-approval-request",
    data: { tool: { id: crypto.randomUUID(), type: "send-email", to, subject, content } },
  });
  return "Requested to send an email";
},
// stopWhen: [stepCountIs(10), hasToolCall("sendEmail")]
```

Runs inside `createUIMessageStream`; `writer.merge(streamTextResult.toUIMessageStream())`.

## Approve / reject UI (09.03)

Approve sends immediately:

```ts
sendMessage({ parts: [{ type: "data-approval-decision", data: { toolId: tool.id, decision: { type: "approve" } } }] });
```

Reject enters a feedback mode, then sends with reason:

```ts
sendMessage({ parts: [{ type: "data-approval-decision", data: { toolId: tool.id, decision: { type: "reject", reason: input } } }] });
```

Track decided tools to hide buttons:

```ts
const decided = new Set(
  messages.flatMap((m) => m.parts).filter((p) => p.type === "data-approval-decision").map((p) => p.data.toolId)
);
```

## Convert data parts for the LLM (09.04)

```ts
convertToModelMessages<MyMessage>(messages, {
  convertDataPart(part) {
    if (part.type === "data-approval-request") return { type: "text", text: `The assistant requested to send an email: To: ${part.data.tool.to}, Subject: ${part.data.tool.subject}, Content: ${part.data.tool.content}` };
    if (part.type === "data-approval-decision")
      return part.data.decision.type === "approve"
        ? { type: "text", text: "The user approved the tool." }
        : { type: "text", text: `The user rejected the tool: ${part.data.decision.reason}` };
    return part;
  },
});
```

## Gate decisions (09.05)

```ts
export const findDecisionsToProcess = ({ mostRecentUserMessage, mostRecentAssistantMessage }) => {
  if (!mostRecentAssistantMessage) return [];
  const tools = mostRecentAssistantMessage.parts.filter((p) => p.type === "data-approval-request").map((p) => p.data.tool);
  const decisions = new Map(
    mostRecentUserMessage.parts.filter((p) => p.type === "data-approval-decision").map((p) => [p.data.toolId, p.data.decision])
  );
  const toProcess = [];
  for (const tool of tools) {
    const decision = decisions.get(tool.id);
    if (!decision) return { message: `No decision found for tool ${tool.id}`, status: 400 };
    toProcess.push({ tool, decision });
  }
  return toProcess;
};
```

Caller validates the last message is a user message and finds the last assistant message; returns the 400 if `"status" in result`.

## Execute approved tools + result parts (09.06)

```ts
for (const { tool, decision } of hitlResult) {
  if (decision.type === "approve") {
    sendEmail({ to: tool.to, subject: tool.subject, content: tool.content });
    const messagePart = { type: "data-approval-result" as const, data: { toolId: tool.id, output: { type: tool.type, message: "Email sent!" } } };
    writer.write(messagePart);
    messagesAfterHitl.at(-1)!.parts.push(messagePart);
  }
}
```

Convert result for the LLM:

```ts
if (part.type === "data-approval-result") return { type: "text", text: `The tool was performed: ${part.data.output.message}` };
```

Then continue the agent with the annotated history including result parts.

## Starter mapping

- Add the three data types to the chat message's custom data-types map (alongside `attachment`, `error`, `chat-created` in `BaseCustomUIDataTypes`).
- Use the existing `createUIMessageStream` + `writer` in the chat route.
- Authorize execution server-side like any mutation; make it idempotent to survive stream replays.
- Reminder: on this repo, native `needsApproval` (above) is the default; only use this custom pattern when native parts genuinely fall short.
