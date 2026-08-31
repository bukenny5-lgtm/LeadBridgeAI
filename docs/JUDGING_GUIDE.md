# Judging Guide

LeadBridge AI addresses the problem of handling customer responses across multiple channels without losing evidence, consistency, or approval control.

## What the system does

The demo shows a unified inbox for synthetic customer messages. Each message can be filtered, reviewed, processed, and escalated using verified evidence from synthetic fixtures. The browser displays the customer message, the evidence trail, the draft response, and the evaluation summary in one place.

## Workflow judges should look for

1. A message enters the synthetic inbox.
2. The workflow identifies the likely intent and retrieves verified evidence.
3. The system drafts a grounded reply instead of inventing facts.
4. If the case is risky or ambiguous, it escalates for specialized review.
5. Every customer-facing response remains inside a human approval step.
6. Provisional orders are only created when the workflow has enough evidence to do so safely.

## What is synthetic

- Messages
- Product and inventory data
- Delivery and negotiation policy data
- Evaluation cases and reports
- Coding-agent and runtime-agent traces

Nothing in the demo depends on a live social-media or email account.

## What judges should try

- Open the inbox and review the message list.
- Filter by lifecycle state or channel.
- Open a sales inquiry and inspect the evidence panel.
- Trigger a grounded draft and confirm that approval is still required.
- Try a complaint or unsupported request to see escalation behavior.
- Trigger a synthetic new message and confirm the inbox updates.

## Why it matters

The project is designed to show that a sales-response assistant can be useful without allowing the model to bypass evidence checks, policy rules, or human approval.
