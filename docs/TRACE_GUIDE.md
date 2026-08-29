# Trace Guide

## Purpose

Future coding-agent and runtime-agent traces should show how the system was built and how it behaved without exposing secrets or personal data.

## Coding-agent traces

Record:

- the task being worked on
- the files inspected
- the files created or changed
- important design decisions
- verification commands and their results
- any failures and retries

## Runtime-agent traces

Record:

- representative instructions
- tool calls
- tool results
- retries
- verification feedback
- human checkpoints
- final outcomes

## Redaction rules

- Remove secrets, tokens, and credentials.
- Remove personal data where possible.
- Keep identifiers only when they are needed to explain the trace.
- Prefer summaries for sensitive message contents.

## Organization

Store coding-agent traces under `traces/coding-agent/` and runtime-agent traces under `traces/runtime-agent/`.

Do not invent traces. Only record events that actually happened.
