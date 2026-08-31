# Demo Script

Recommended duration: 3 to 5 minutes.

Recommended setup:

- Browser at 1080p if possible.
- Zoom level around 100% to 110%.
- Keep the browser and terminal visible only if needed for the story.
- Use the local demo at `http://127.0.0.1:4173/`.

## Recording sequence

1. Problem statement
   - Narration: “LeadBridge AI helps a seller manage cross-channel customer questions without losing evidence or approval control.”
   - On screen: show the inbox landing page.

2. Unified multi-channel inbox
   - Narration: “All synthetic messages live in one inbox, regardless of channel.”
   - On screen: show the message list and channel badges.

3. Search and filter
   - Narration: “We can filter by channel and workflow state to find the right message quickly.”
   - On screen: use the inbox filters and open a different message.

4. Analyze a sales inquiry
   - Narration: “The workflow starts by recognizing the inquiry and pulling verified evidence from synthetic fixtures.”
   - On screen: open a pricing or delivery question and expand the evidence panel.

5. Verified evidence
   - Narration: “The reply is grounded in evidence instead of free-form invention.”
   - On screen: point to product, policy, and trace references.

6. Grounded draft
   - Narration: “The system prepares a draft, but it does not send it automatically.”
   - On screen: show the draft area and the approval requirement.

7. Human approval
   - Narration: “Every customer-facing response still needs human approval.”
   - On screen: click the approval control and show the status change.

8. Specialized escalation
   - Narration: “Unsupported or risky requests go to specialized review instead of being answered autonomously.”
   - On screen: open an escalation case and show the reason.

9. Provisional order or revision
   - Narration: “If the case is well supported, the workflow can move toward a provisional order; otherwise it requests revision.”
   - On screen: show one message moving to revision and another to a provisional-order path if available.

10. Synthetic new-message alert
    - Narration: “A synthetic notification arrives when a new message is added.”
    - On screen: trigger the demo action that creates the alert.

11. Evaluation comparison
    - Narration: “The stored evaluation history shows a 20.00% baseline and a 60.00% verified-tool result.”
    - On screen: open the evaluation summary section.

12. Limitations and close
    - Narration: “This remains a synthetic demo, but it shows the workflow we would ship with real integrations later.”
    - On screen: briefly restate the synthetic-only scope and close.

## What not to expose

- Any secret values
- Any `.env` content
- Any raw credentials
- Any unsupported claims about real platform access
- Any expectation that the demo sends real messages
