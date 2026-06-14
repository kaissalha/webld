---
name: pr-review-plan
description: Generate structured PR review plans that break changes into logical problem/solution groups with file links, diagrams, and flagged issues. Use when the user asks to "review a PR", "create a review plan", "break down PR changes", or references a PR number for analysis.
---

# PR Review Plan Generator

Create comprehensive, easy-to-read review plans for pull requests that organize changes into logical problem/solution groups, then submit review comments to GitHub.

## Prerequisites

1. **Verify GitHub MCP is available.** Before doing anything else, call `user-github-get_file_contents` with `owner`, `repo`, and `path: "/"` (or any lightweight GitHub MCP tool) to confirm the GitHub MCP server is connected. If the call fails or the tool is not found, stop immediately and tell the user:

   > "The GitHub MCP server is not connected. Please make sure the GitHub MCP is installed and enabled in your Cursor MCP settings, then try again."

   Do NOT proceed with the rest of the workflow until this check passes.

2. **Switch to Plan mode** using the `SwitchMode` tool with `target_mode_id: "plan"`. PR review plans are read-only analysis tasks and should always be prepared in Plan mode. This ensures the agent does not accidentally modify any files while analyzing the PR.

## Workflow

There are two phases: **Phase A** builds the review plan, **Phase B** performs the deep review and submits comments.

---

### Phase A: Build the Review Plan

#### Step 1: Fetch PR Data

1. Determine the GitHub owner/repo from `git remote -v`
2. Fetch PR metadata: `pull_request_read` with method `get`
3. Fetch changed files: `pull_request_read` with method `get_files` (perPage: 100)
4. Fetch the full diff: `pull_request_read` with method `get_diff`

#### Step 2: Read Key Files

Read the full content of:
- All **new** files (status: "added")
- Files with **significant changes** (high additions count or complex logic)
- For simple 1-line `sizes` or prop additions, the diff patch is sufficient

When comparing new code against existing patterns, read the existing counterpart (e.g., read `WebsiteRenderer` when reviewing a new `LiveSiteRenderer`).

#### Step 3: Analyze and Group Changes

Group files into **problem/solution sets** based on logical cohesion, not file location. Each group should answer: "What problem does this set of changes solve?"

Grouping heuristics:
- New architectural components (new renderers, new abstractions)
- Resource loading changes (fonts, images, scripts)
- Bulk mechanical changes (adding the same prop to many files)
- Performance optimizations (CSS containment, lazy loading)
- Tree-shaking / bundle size enablers

#### Step 4: Generate the Draft Review Plan

Use the `create_plan` tool with the structure defined in the **Review Plan Format** section below.

At this stage, flag issues liberally — include anything that *might* be a problem. These are candidates to investigate, not final findings. Label the issues section "Potential Issues" in each Part.

#### Step 5: Investigate and Confirm Issues

Before presenting the plan to the user, **investigate every potential issue** to confirm or dismiss it. Do not include unverified suspicions in the final plan.

For each flagged issue:

1. **Read the relevant source files** — not just the diff, but surrounding context, related modules, DB schemas, type definitions, test files, etc. as needed to verify the claim.
2. **Trace the code path end-to-end** — e.g., if the issue is "this value might be wrong," follow it from where it's produced to where it's consumed and check each step.
3. **Check assumptions against the codebase** — e.g., if the issue claims "defaults might mismatch," read the actual DB schema and compare. If the issue claims "this causes re-renders," check whether the child components are memoized.
4. **Make a verdict:**
   - **Confirmed** — the issue is real and reproducible. Keep it in the plan at its assigned severity (High / Medium / Low).
   - **Dismissed** — the issue is a false positive. Remove it from the issues list and add a brief note under an "Investigated and Dismissed" subsection in the relevant Part explaining why.

**Rules for confirming vs dismissing:**

- **Keep** issues at any severity (including Low) as long as they are legitimate — real bugs, real correctness concerns, real design smells, or real gaps (e.g., missing test coverage).
- **Dismiss** issues that are speculative, based on incorrect assumptions about the code, or that investigation proves are not actually problems (e.g., defaults that turn out to match, re-render concerns where children aren't memoized, off-by-one that matches the original code's intent).
- When in doubt, keep the issue but downgrade its severity.

#### Step 6: Finalize the Review Plan

Update the plan file (using edit tools on the plan file directly) to:

1. Replace "Potential Issues" with "Confirmed Issues" in each Part that has surviving issues.
2. Add "Investigated and Dismissed" subsections listing dismissed items with one-line reasoning.
3. Update the summary table to contain only confirmed issues.
4. Update the todos to contain only confirmed issues.
5. Remove Parts that have no confirmed issues and no other noteworthy content (keep them if they still provide useful structural context for the reviewer).

This is the plan the user sees. It should contain **only verified findings** — no "verify this" or "might be a problem" hedging. Each confirmed issue should state what is wrong and why with certainty.

---

### Phase B: Deep Review and Comment Submission

Phase B starts **after the user confirms the Phase A plan** (i.e., clicks "Build" or otherwise approves).

#### Step 7: Run Deep Reviews in Parallel

For each Part identified in the Phase A plan, launch a **parallel sub-agent** (using the `Task` tool with `subagent_type: "generalPurpose"`) to perform the deep review. Each sub-agent receives:

- The Part number, name, and description from the Phase A plan
- The list of files to review for that Part
- The flagged potential issues for that Part
- The PR number, owner, and repo

Each sub-agent must:
1. Read the relevant files in full (not just the diff)
2. Analyze each flagged issue: confirm it, dismiss it with reasoning, or escalate it
3. Look for any additional issues not caught in Phase A
4. Return a structured list of **review comments**, each with:
   - `file`: relative path from repo root
   - `line`: the line number in the new file (RIGHT side of the diff)
   - `body`: the comment text in markdown (include severity, explanation, code snippet, and suggestion)
   - `startLine` (optional): for multi-line comments

Limit to **4 parallel sub-agents at a time** (launch in batches if there are more than 4 parts).

#### Step 8: Build the Final Review Comments Plan

After all sub-agents return, create a **second plan** (using `create_plan`) that consolidates all review comments. This plan is titled:

```
PR #[NUMBER] Review Comments (Ready to Submit)
```

The plan body contains:
1. A summary of findings per Part (1-2 sentences each)
2. The full list of comments that will be posted, formatted as:

```markdown
### Comment [N] — [Severity] — `[file:line]`

[The exact comment body that will be posted to GitHub]
```

3. A count: "**X comments** will be submitted to PR #[NUMBER]."

**Do NOT submit any comments to GitHub yet.** Wait for the user to review this plan and confirm.

#### Step 9: Submit Comments to GitHub

Once the user confirms the final review comments plan (clicks "Build" or approves), submit the review:

1. Create a **pending review** using `pull_request_review_write` with method `create` (no `event` parameter — this creates a pending review).
2. For each comment, call `user-github-add_comment_to_pending_review` with:
   - `owner`, `repo`, `pullNumber`
   - `path`: the file path relative to the repo root
   - `line`: the line number on the RIGHT side of the diff
   - `body`: the comment markdown
   - `side: "RIGHT"`
   - `subjectType: "LINE"`
   - For multi-line comments, also include `startLine` and `startSide: "RIGHT"`
3. Submit the pending review using `pull_request_review_write` with method `submit_pending`, `event: "COMMENT"`, and an overall body summarizing the review.

---

### Executing Assigned Comment Tasks

When the user assigns specific todo IDs (e.g. `comment-issue-4-promise-all`, `comment-issue-6-blocking-step`) rather than asking for a full Phase B run, follow this focused workflow:

#### Step 1: Mark and read

1. Mark the assigned todos `in_progress` starting with the first one.
2. Re-read the plan file attached to the conversation to recall the issue details (file path, line hint, severity, and suggested fix).

#### Step 2: Resolve real line numbers from the diff

**Do not use the line numbers written in the plan** — those reference the overall diff line count, not the position in the new file. For each file involved:

1. Call `pull_request_read` with `method: "get_files"` and parse the `patch` field for the relevant file.
2. Count the `+` lines in the patch to determine the correct line number in the new file on the RIGHT side of the diff.

#### Step 3: Create a pending review and add comments

1. Call `pull_request_review_write` with `method: "create"` (no `event`) to open a pending review.
2. For each assigned todo, call `add_comment_to_pending_review` with:
   - `path`: repo-root-relative file path
   - `line`: the resolved line number (RIGHT side)
   - `side: "RIGHT"`, `subjectType: "LINE"`
   - `body`: formatted per the **GitHub Comment Formatting** template below
   - For issues with a concrete fix, include a ` ```suggestion ``` ` block targeting the exact line(s) so the author can apply it with one click
   - For multi-line suggestions, also pass `startLine` and `startSide: "RIGHT"`

#### Step 4: Submit and mark complete

1. Call `pull_request_review_write` with `method: "submit_pending"`, `event: "COMMENT"`, and a `body` summarising all comments posted in this batch.
2. Mark each todo `completed`.

> **Batch all assigned todos into one review** — never create a separate pending review per comment. GitHub only allows one pending review per user at a time.

---

## Review Plan Format

### Header

```markdown
# PR #[NUMBER] Review Plan: [PR Title]

**Author:** [username] | **Branch:** `[head]` -> `[base]`
**Scope:** [N] files changed, +[additions] / -[deletions]
```

### Parts

Title each group as `Part 1: [Descriptive Name]`, `Part 2: ...`, etc.

Each part follows this structure:

```markdown
## Part N: [Name] ([Category])

**Problem:** [1-2 sentences explaining what's wrong or suboptimal]

**Solution:** [1-2 sentences explaining the approach taken]

[Optional: mermaid diagram for complex architectural or data flow changes]

### Files to Review

- [`short-filename.tsx`](relative/path/from/workspace/root) -- Brief description of change

### Confirmed Issues

**[N]. [Issue title] ([file:line])**

[Explanation of the concern — stated with certainty, not as a hypothesis]

\`\`\`typescript
// Inline the problematic code snippet
\`\`\`

[Suggestion for improvement]

### Investigated and Dismissed

- **[Brief issue title]** -- [One-line explanation of why it's not a real issue]
```

Note: During the draft plan (Step 4), use "Potential Issues" as the heading. After investigation (Step 5-6), replace with "Confirmed Issues" for verified findings and add "Investigated and Dismissed" for false positives.

### Summary Table

End with a table of **confirmed issues only**, sorted by severity: High → Medium → Low:

```markdown
## Summary of Confirmed Issues

| # | Severity | File | Issue |
|---|----------|------|-------|
| 1 | High     | file.tsx:42 | Brief description |
| 2 | Medium   | other.ts:17 | Brief description |
| 3 | Low      | page.tsx:88 | Brief description |
```

## Rules

### File Links

- Use **workspace-relative paths** so links open in the editor: `[short-name.tsx](packages/foo/src/bar.tsx)`
- Use the shortest unambiguous filename as the link text
- For bulk changes (e.g., 25 files all adding `sizes` prop), sub-group by category (Banner, Feature, etc.)

### Diagrams

Use mermaid diagrams when the change involves:
- Architectural splits (new renderer vs old renderer)
- Data/request flow changes (font loading sequence)
- State machine or lifecycle changes

Follow these mermaid rules:
- No spaces in node IDs (use camelCase)
- No HTML tags like `<br/>` in labels
- Wrap labels with special chars in double quotes
- Do not use explicit colors or styling

### Issue Flagging

Flag potential issues with a severity level:
- **High** -- Likely to cause user-visible bugs or regressions
- **Medium** -- Correctness concern or design smell that should be discussed
- **Low** -- Minor nitpick, style concern, or "verify this is intentional"
- **Info** -- Known limitation worth documenting, no action needed

When flagging an issue:
1. Inline the problematic code snippet (3-10 lines)
2. Explain *why* it's a problem, not just *what* the code does
3. Suggest a fix or verification step when possible

### What to Look For

- Dead code or unreachable conditions (e.g., checking falsiness of an array that's always `[]`)
- Error handling that throws instead of degrading gracefully
- Shared code that now behaves differently in different contexts (editor vs live site)
- Bundle size: static imports that defeat tree-shaking goals
- React patterns: hooks called conditionally, missing memoization, Suspense boundaries
- CSS: containment side effects, overflow clipping, stacking context changes
- Performance: over-prioritizing resources, redundant loading strategies
- Duplication between old and new code paths without shared extraction

### Todos

Create **one todo per flagged issue** (not per Part) so individual issues can be assigned and tracked independently. Use this ID format:

```
comment-issue-[N]-[short-kebab-description]
```

Where `N` is the issue number from the summary table and the description is a 2–4 word kebab-case label for the issue. Example:

```yaml
todos:
  - id: comment-issue-1-promise-all
    content: "[High] Post PR comment + suggestion: generateReferenceImages uses Promise.all — switch to allSettled (generate-reference-images.ts:27)"
    status: pending
  - id: comment-issue-2-blocking-step
    content: "[High] Post PR comment: runVideoGeneration awaits child workflow returnValue inside a step — may hit step timeout (start-video-gen.ts:26)"
    status: pending
  - id: comment-issue-3-route-timeout
    content: "[Medium] Post PR comment + suggestion: route blocks on returnValue — will timeout on Vercel (route.ts:35)"
    status: pending
```

The `content` field should include the severity tag, a short description of the action (post comment / post comment + suggestion), and the file + approximate line number from the plan.

### GitHub Comment Formatting

When composing review comments for GitHub submission, each comment body should follow this template:

```markdown
**[Severity]**: [Short title]

[Explanation of the concern — why this is a problem, not just what the code does]

\`\`\`suggestion
// Optional: include a suggested code fix if applicable
\`\`\`

[Any additional context or verification steps]
```

Use GitHub's `suggestion` code fence syntax when proposing concrete code changes so the author can apply them with one click.
