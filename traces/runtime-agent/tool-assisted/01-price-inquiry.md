# Trajectory for LB-001

- Route: pricing
- Evidence: post:facebook:fb-post-001, product:UG-PRD-101, policy:NEG-101
- Final prediction: {
  "response_text": "Thanks for reaching out. I will verify the request and prepare a draft for approval.",
  "is_lead": true,
  "intent_labels": [
    "pricing_request"
  ],
  "product_id": "UG-PRD-101",
  "action": "reply_with_verified_price",
  "escalation": false,
  "lead_creation": true,
  "provisional_order": false,
  "order_fields": null
}

## Tool Calls

- findProductByPost
  - Outcome: found
  - Args: {"channel":"facebook","postId":"fb-post-001"}
  - Evidence: post:facebook:fb-post-001, product:UG-PRD-101
  - Duration: 0 ms
- getProduct
  - Outcome: found
  - Args: {"productId":"UG-PRD-101"}
  - Evidence: product:UG-PRD-101
  - Duration: 0 ms
- getNegotiationPolicy
  - Outcome: found
  - Args: {"productId":"UG-PRD-101","quantity":1}
  - Evidence: policy:NEG-101
  - Duration: 0 ms

## Workflow Decision

- Approval or escalation: normal approval queue
- Provisional order: no

- Sanitized and synthetic only.
