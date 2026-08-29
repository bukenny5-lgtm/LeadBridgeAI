# Trajectory for LB-006

- Route: negotiation
- Evidence: post:instagram:ig-post-006, product:UG-PRD-102, policy:NEG-102
- Final prediction: {
  "response_text": "Thanks for reaching out. I will verify the request and prepare a draft for approval.",
  "is_lead": true,
  "intent_labels": [
    "negotiation_within_policy"
  ],
  "product_id": "UG-PRD-102",
  "action": "apply_allowed_discount_or_confirm_verified_price",
  "escalation": false,
  "lead_creation": true,
  "provisional_order": false,
  "order_fields": null
}

## Tool Calls

- findProductByPost
  - Outcome: found
  - Args: {"channel":"instagram","postId":"ig-post-006"}
  - Evidence: post:instagram:ig-post-006, product:UG-PRD-102
  - Duration: 0 ms
- getProduct
  - Outcome: found
  - Args: {"productId":"UG-PRD-102"}
  - Evidence: product:UG-PRD-102
  - Duration: 0 ms
- getNegotiationPolicy
  - Outcome: found
  - Args: {"productId":"UG-PRD-102","quantity":10}
  - Evidence: policy:NEG-102
  - Duration: 0 ms

## Workflow Decision

- Approval or escalation: normal approval queue
- Provisional order: no

- Sanitized and synthetic only.
