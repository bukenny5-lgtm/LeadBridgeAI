# Trajectory for LB-011

- Route: order_capture
- Evidence: product:UG-PRD-105, product:UG-PRD-103, product:UG-PRD-106
- Final prediction: {
  "response_text": "Thanks for reaching out. I will verify the request and prepare a draft for approval.",
  "is_lead": true,
  "intent_labels": [
    "confirmed_order_intent"
  ],
  "product_id": null,
  "action": "capture_provisional_order_details",
  "escalation": false,
  "lead_creation": true,
  "provisional_order": true,
  "order_fields": [
    "quantity",
    "payment_timing",
    "invoice_request"
  ]
}

## Tool Calls

- searchCatalogue
  - Outcome: found
  - Args: {"query":"please send the invoice for 3 toner packs i will pay today"}
  - Evidence: product:UG-PRD-105, product:UG-PRD-103, product:UG-PRD-106
  - Duration: 1 ms

## Workflow Decision

- Approval or escalation: normal approval queue
- Provisional order: yes

- Sanitized and synthetic only.
