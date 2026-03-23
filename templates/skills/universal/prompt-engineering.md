---
description: "Effective prompting patterns for working with Claude, demanding quality, writing specs"
---

# Prompt Engineering

## Challenge Claude to Do Better

Claude will give you a reasonable answer. You often want an excellent one.
The difference is in how you ask.

Weak: "Write a function to parse dates."
Strong: "Write a date parser that handles ISO 8601, RFC 2822, and common US/EU
formats. It should return a consistent internal representation and throw specific
error types for invalid input. Make it elegant — no regex spaghetti."

The strong version sets quality expectations, specifies edge cases, and demands
craft. Claude responds to these signals.

## Demand Elegance

When Claude produces a working but mediocre solution, push back:

- "This works but it's not elegant. Simplify it."
- "There's duplication between these three functions. Refactor."
- "This is too clever. Make it readable."
- "A junior engineer should understand this. Rewrite for clarity."

Don't accept the first output as final. Iterate.

## When to Be Specific vs When to Delegate

Be specific about:
- Requirements (what the code MUST do)
- Constraints (performance, compatibility, patterns to follow)
- Verification criteria (how to know it works)

Delegate to Claude:
- Implementation approach (unless you have a strong preference)
- Variable naming and code organization details
- Which standard library functions to use
- Test case generation (give the categories, let Claude enumerate)

## Writing Detailed Specs

A good spec eliminates ambiguity. The SPEC.md pattern works because it forces
specificity before implementation begins.

Spec checklist:
- Every feature described with concrete examples
- Input/output pairs for non-obvious behavior
- Error cases listed explicitly
- "Out of scope" section to prevent feature creep
- Success criteria that can be mechanically verified

## The IMPLEMENTATION-PROMPT as a Prompt

The implementation prompt IS your prompt to Claude for a work session. Write it
like you're briefing a skilled contractor:

1. Here's what exists (context)
2. Here's what we need (goal)
3. Here's how to do it (plan)
4. Here's how to check your work (verification)
5. Here's what NOT to do (constraints)

## Prompting Anti-Patterns

- Vague asks: "Make the code better" — better HOW?
- Kitchen sink: asking for 10 things at once with no priority order
- Assuming context: referencing decisions made 500 messages ago without restating them
- Over-constraining: specifying the exact implementation when only the interface matters
- Under-specifying errors: "handle errors appropriately" — define what appropriate means

## Working with Models at Different Levels

Opus: Use for judgment calls, architectural decisions, plan review. Give it the full
picture and ask for analysis.

Sonnet: Use for implementation, testing, code review. Give it specific tasks with
clear scope.

Haiku: Use for validation, formatting checks, simple queries. Give it narrow tasks
with yes/no or pass/fail outcomes.

Match the task complexity to the model capability.

## Gotchas

- Claude remembers everything in the conversation. You don't need to repeat instructions
  that are already in context. But after /compact, re-state critical constraints.
- If Claude keeps making the same mistake, the problem is probably in your instructions,
  not in Claude. Rephrase, add an example, or add a rule to CLAUDE.md.
- Long prompts aren't always better. A focused 3-line instruction often outperforms
  a rambling paragraph. Be concise about what matters.
- When Claude says "I'll do X" but you wanted Y, correct immediately. Don't let
  wrong assumptions propagate through a chain of actions.
