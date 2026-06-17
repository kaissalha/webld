---
name: human-in-the-loop
description: 'Add human-in-the-loop (HITL) approval to AI agents on the starter stack (AI SDK v6 native needsApproval, ToolLoopAgent, useChat addToolApprovalResponse, Next.js chat route). Use whenever an agent should pause for human approval before a consequential action - sending email, deleting data, spending money, making external API calls, "require approval", "confirm before doing X", "let the user approve/reject the tool", "ask before sending", approve/reject UI, or gating risky tool calls. Also use when building the frontend approve/reject UI or wiring approval decisions back to the model.'
---

# Human-in-the-Loop Approval (starter stack)

Some tool calls are too consequential to run autonomously (sending email, deleting records, charging a card). HITL pauses the agent at the tool call, surfaces the proposed action to the user, and only executes after explicit approval.

**On this repo (`ai@6`), use AI SDK v6 native `needsApproval`.** The starter already runs on `ToolLoopAgent` and has the client side of the native flow plumbed through `useChat`. Verify the exact API with the `ai-sdk` skill (check `node_modules/ai/docs/03-ai-sdk-core/15-tools-and-tool-calling.mdx` and `node_modules/ai/docs/04-ai-sdk-ui/03-chatbot-tool-usage.mdx`) before writing code.

The native flow gives you everything the cohort's hand-rolled version did - typed approval parts, rejection feedback (`reason`), and dynamic per-input gating - with far less plumbing. Only fall back to custom data parts when you need UX the native parts can't express (see the last section).

## What the repo already has

- **Agents**: `dashboardChatAgent` / `ragAgent` are `ToolLoopAgent`s ([packages/server/src/ai/agents](../../../packages/server/src/ai/agents)). The loop already pauses when "a tool call needs approval" - no `stopWhen` change required.
- **Client**: [chat-runtime-sync.tsx](../../../apps/webapp/src/app/[locale]/dashboard/chat/components/chat-runtime-sync.tsx) destructures `addToolApprovalResponse` from `useChat` and pushes it into the chat store; [chat-session-store.ts](../../../apps/webapp/src/components/chat/stores/chat-session-store.ts) exposes it to any component via `useChatSession`.
- **Gap to close** for a real feature: (1) set `needsApproval` on the risky tool, (2) render the `approval-requested` state with Approve/Deny, (3) make `sendAutomaticallyWhen` continue after an approval.

## The native flow

```mermaid
sequenceDiagram
  participant User
  participant Route as Chat route (ToolLoopAgent)
  participant LLM
  User->>Route: message
  Route->>LLM: agent.stream
  LLM->>Route: risky tool call (needsApproval)
  Route->>User: tool part state = approval-requested (streamed)
  User->>Route: addToolApprovalResponse({ id, approved, reason? })
  Route->>Route: approved -> run execute; denied -> tell the model
  Route->>LLM: continue, model responds
```

Two model round-trips: the first returns the approval request, the second (after the response) executes or reports the denial.

## 1. Gate the tool (server)

Set `needsApproval` on the tool in [packages/server/src/ai/tools](../../../packages/server/src/ai/tools). `execute` stays as the real side effect - it only runs after approval, so you don't split the tool in two.

```ts
import { tool } from "ai";
import { z } from "zod";

export const sendEmailTool = tool({
  description: "Send an email to a contact",
  inputSchema: z.object({ to: z.string(), subject: z.string(), body: z.string() }),
  needsApproval: true, // or async ({ to }) => isExternal(to)
  execute: async ({ to, subject, body }, { experimental_context }) => {
    // authorize against experimental_context like any mutation, then send
    return await sendEmail({ to, subject, body });
  },
});
```

Use the async form for risk-based gating (e.g. only require approval over a threshold): `needsApproval: async ({ amount }) => amount > 1000`. Add a system-prompt line like "If a tool execution is not approved, do not retry it" so the model doesn't loop on denial.

## 2. Approve / deny UI (client)

When a tool needs approval, its tool part has `state: "approval-requested"`. Read `addToolApprovalResponse` from the store (already bound) and respond with `part.approval.id`:

```tsx
const addToolApprovalResponse = useChatSession((s) => s.addToolApprovalResponse);

// in the tool-part renderer for `tool-sendEmail`:
if (part.state === "approval-requested") {
  return (
    <ApprovalCard input={part.input}>
      <Button onClick={() => addToolApprovalResponse?.({ id: part.approval.id, approved: true })}>Approve</Button>
      <Button onClick={() => addToolApprovalResponse?.({ id: part.approval.id, approved: false, reason })}>Deny</Button>
    </ApprovalCard>
  );
}
```

`reason` is optional context the model sees on denial - collect it from a textarea for richer rejection feedback. Other states (`input-available`, `output-available`, `output-error`) render like any tool part.

## 3. Continue after approval

`chat-runtime-sync.tsx` currently sets `sendAutomaticallyWhen` to `() => false`. To auto-resume after an approval decision, use the native helper (don't broaden it to auto-submit on every tool call unless you also want that):

```ts
import { lastAssistantMessageIsCompleteWithApprovalResponses } from "ai";
// in useChat({ ... }):
sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
```

Or call `sendMessage()` manually after the user decides. Without one of these, nothing happens after Approve.

## 4. Core (non-`useChat`) handling

When driving the agent yourself (e.g. a server-to-server loop), the request surfaces as `tool-approval-request` parts in `result.content`; respond by appending a tool message:

```ts
import type { ToolApprovalResponse } from "ai";

for (const part of result.content) {
  if (part.type === "tool-approval-request") {
    approvals.push({ type: "tool-approval-response", approvalId: part.approvalId, approved: true, reason });
  }
}
messages.push({ role: "tool", content: approvals });
// call the agent/generateText again with updated messages
```

## Key principles

- Prefer native `needsApproval` on this repo - it's typed, supports dynamic gating and rejection reasons, and `ToolLoopAgent` already pauses for it.
- Keep the real side effect in `execute`; it only runs post-approval, so there's no separate "execute approved tools" step.
- Authorize execution server-side via `experimental_context` like any mutation; make it idempotent to survive stream replays.
- Tell the model not to retry denied calls.

## Common pitfalls

- Forgetting `sendAutomaticallyWhen` (or a manual `sendMessage`) - the conversation stalls after Approve.
- Using `addToolOutput` instead of `addToolApprovalResponse` for an approval gate (output is for client-side tools that run in the browser; approval keeps execution on the server).
- Reinventing custom approval data parts when native parts already cover the need.
- Not setting a "do not retry denied tools" instruction - the model re-proposes the same call.

## When to fall back to custom data parts

Native parts cover most cases. Reach for the custom-data-parts pattern only when you need something native can't express - e.g. an approval that isn't tied to a single tool call, multi-party / out-of-band approval, a rich editable proposal before execution, or persisting bespoke approval audit state in the message stream. That pattern (defer in `execute`, `data-approval-request/decision/result`, `convertDataPart`, gate pending decisions, execute approved tools) is documented in [references/techniques.md](references/techniques.md).
