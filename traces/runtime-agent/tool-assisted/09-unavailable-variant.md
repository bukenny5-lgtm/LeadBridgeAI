# Trajectory for unavailable variant

- Route: variant
- Evidence: post:instagram:ig-post-020, product:UG-PRD-108
- Final prediction: {
  "response_text": "Thanks for reaching out. I will verify the request and prepare a draft for approval.",
  "is_lead": true,
  "intent_labels": [
    "variant_request"
  ],
  "product_id": "UG-PRD-108",
  "action": "ask_for_clarifying_product_details",
  "escalation": false,
  "lead_creation": true,
  "provisional_order": false,
  "order_fields": null
}

## Tool Calls

- findProductByPost
  - Outcome: found
  - Args: {"channel":"instagram","postId":"ig-post-020"}
  - Evidence: post:instagram:ig-post-020, product:UG-PRD-108
  - Duration: 0 ms
- getProduct
  - Outcome: found
  - Args: {"productId":"UG-PRD-108"}
  - Evidence: product:UG-PRD-108
  - Duration: 0 ms
- getProduct
  - Outcome: found
  - Args: {"productId":"UG-PRD-108"}
  - Evidence: product:UG-PRD-108
  - Duration: 0 ms

## Workflow Decision

- Approval or escalation: normal approval queue
- Provisional order: no

- Sanitized and synthetic only.
