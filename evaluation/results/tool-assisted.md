# Tool-Assisted Evaluation Report

- Evaluation version: 3.0.0
- Timestamp: 2026-08-29T18:35:09.410Z
- Baseline reference: evaluation\results\baseline.json (20.00%)
- Comparison: +40.00 points
- Relative change: 200.00%
- Tool-assisted baseline: Deterministic verified-tool workflow
- Description: Rule-based workflow that uses synthetic business data and controlled read-only tools to isolate the value of verified context.
- Exact command: `npm run evaluate:tools`
- Case count: 20
- Primary metric: Correctly Handled Buying Opportunity Rate = 60.00% (12/20)

## Secondary Metrics

- Intent accuracy: 80.00%
- Escalation accuracy: 80.00%
- Factual integrity: 100.00%
- Policy safety: 100.00%

## Aggregate Counts

- Passing cases: 12
- Failing cases: 8
- Runtime: 39 ms
- Model/API cost: $0.00

## Per-Case Results

| Case | Pass | Failed Dimensions | Tools |
| --- | --- | --- | --- |
| LB-001 | PASS | None | findProductByPost -> getProduct -> getNegotiationPolicy |
| LB-002 | PASS | None | findProductByPost -> getProduct -> checkInventory -> checkInventory |
| LB-003 | FAIL | intent_labels, correct_action_escalation | findProductByPost -> getProduct -> getProduct |
| LB-004 | FAIL | product_association_or_clarification | searchCatalogue -> getBusinessLocation |
| LB-005 | FAIL | intent_labels, correct_action_escalation | findProductByPost -> getProduct -> getProduct |
| LB-006 | PASS | None | findProductByPost -> getProduct -> getNegotiationPolicy |
| LB-007 | FAIL | intent_labels, product_association_or_clarification, correct_action_escalation | searchCatalogue |
| LB-008 | PASS | None | findProductByPost -> getProduct -> checkInventory |
| LB-009 | PASS | None | findProductByPost -> searchCatalogue |
| LB-010 | FAIL | intent_labels, correct_action_escalation, provisional_order_decision, order_fields | findProductByPost -> getProduct -> getProduct |
| LB-011 | FAIL | product_association_or_clarification | searchCatalogue |
| LB-012 | PASS | None | findProductByPost -> searchCatalogue -> getProduct |
| LB-013 | PASS | None | findProductByPost |
| LB-014 | PASS | None | findProductByPost -> getProduct |
| LB-015 | FAIL | product_association_or_clarification |  |
| LB-016 | PASS | None | findProductByPost |
| LB-017 | PASS | None | findProductByPost -> getProduct -> getNegotiationPolicy |
| LB-018 | FAIL | product_association_or_clarification | searchCatalogue |
| LB-019 | PASS | None | findProductByPost -> getProduct -> getNegotiationPolicy |
| LB-020 | PASS | None | findProductByPost -> getProduct -> checkInventory -> getNegotiationPolicy -> checkInventory -> getDeliveryOptions |

## Tool Evidence

### LB-001
- Route: pricing
- Evidence: post:facebook:fb-post-001, product:UG-PRD-101, policy:NEG-101
- Tool: findProductByPost
  - Outcome: found
  - Args: {"channel":"facebook","postId":"fb-post-001"}
  - Evidence: post:facebook:fb-post-001, product:UG-PRD-101
  - Duration: 1 ms
- Tool: getProduct
  - Outcome: found
  - Args: {"productId":"UG-PRD-101"}
  - Evidence: product:UG-PRD-101
  - Duration: 0 ms
- Tool: getNegotiationPolicy
  - Outcome: found
  - Args: {"productId":"UG-PRD-101","quantity":1}
  - Evidence: policy:NEG-101
  - Duration: 0 ms

### LB-002
- Route: availability
- Evidence: post:instagram:ig-post-002, product:UG-PRD-102, product:UG-PRD-102#standard-s2
- Tool: findProductByPost
  - Outcome: found
  - Args: {"channel":"instagram","postId":"ig-post-002"}
  - Evidence: post:instagram:ig-post-002, product:UG-PRD-102
  - Duration: 0 ms
- Tool: getProduct
  - Outcome: found
  - Args: {"productId":"UG-PRD-102"}
  - Evidence: product:UG-PRD-102
  - Duration: 0 ms
- Tool: checkInventory
  - Outcome: found
  - Args: {"productId":"UG-PRD-102"}
  - Evidence: product:UG-PRD-102#standard-s2
  - Duration: 0 ms
- Tool: checkInventory
  - Outcome: found
  - Args: {"productId":"UG-PRD-102"}
  - Evidence: product:UG-PRD-102#standard-s2
  - Duration: 0 ms

### LB-003
- Route: variant
- Evidence: post:tiktok:tt-post-003, product:UG-PRD-103
- Tool: findProductByPost
  - Outcome: found
  - Args: {"channel":"tiktok","postId":"tt-post-003"}
  - Evidence: post:tiktok:tt-post-003, product:UG-PRD-103
  - Duration: 0 ms
- Tool: getProduct
  - Outcome: found
  - Args: {"productId":"UG-PRD-103"}
  - Evidence: product:UG-PRD-103
  - Duration: 0 ms
- Tool: getProduct
  - Outcome: found
  - Args: {"productId":"UG-PRD-103"}
  - Evidence: product:UG-PRD-103
  - Duration: 0 ms

### LB-004
- Route: location
- Evidence: product:UG-PRD-105, product:UG-PRD-101, product:UG-PRD-102, business:SB-001
- Tool: searchCatalogue
  - Outcome: found
  - Args: {"query":"where exactly are you based for pickup in kampala"}
  - Evidence: product:UG-PRD-105, product:UG-PRD-101, product:UG-PRD-102
  - Duration: 2 ms
- Tool: getBusinessLocation
  - Outcome: found
  - Args: {}
  - Evidence: business:SB-001
  - Duration: 0 ms

### LB-005
- Route: variant
- Evidence: post:facebook:fb-post-005, product:UG-PRD-101
- Tool: findProductByPost
  - Outcome: found
  - Args: {"channel":"facebook","postId":"fb-post-005"}
  - Evidence: post:facebook:fb-post-005, product:UG-PRD-101
  - Duration: 0 ms
- Tool: getProduct
  - Outcome: found
  - Args: {"productId":"UG-PRD-101"}
  - Evidence: product:UG-PRD-101
  - Duration: 0 ms
- Tool: getProduct
  - Outcome: found
  - Args: {"productId":"UG-PRD-101"}
  - Evidence: product:UG-PRD-101
  - Duration: 0 ms

### LB-006
- Route: negotiation
- Evidence: post:instagram:ig-post-006, product:UG-PRD-102, policy:NEG-102
- Tool: findProductByPost
  - Outcome: found
  - Args: {"channel":"instagram","postId":"ig-post-006"}
  - Evidence: post:instagram:ig-post-006, product:UG-PRD-102
  - Duration: 0 ms
- Tool: getProduct
  - Outcome: found
  - Args: {"productId":"UG-PRD-102"}
  - Evidence: product:UG-PRD-102
  - Duration: 0 ms
- Tool: getNegotiationPolicy
  - Outcome: found
  - Args: {"productId":"UG-PRD-102","quantity":10}
  - Evidence: policy:NEG-102
  - Duration: 0 ms

### LB-007
- Route: negotiation
- Evidence: product:UG-PRD-105, product:UG-PRD-103, product:UG-PRD-104
- Tool: searchCatalogue
  - Outcome: found
  - Args: {"query":"i will only pay 70 000 for the toner pack"}
  - Evidence: product:UG-PRD-105, product:UG-PRD-103, product:UG-PRD-104
  - Duration: 1 ms

### LB-008
- Route: inventory_unavailable
- Evidence: post:tiktok:tt-post-008, product:UG-PRD-104, product:UG-PRD-104#standard-4pack
- Tool: findProductByPost
  - Outcome: found
  - Args: {"channel":"tiktok","postId":"tt-post-008"}
  - Evidence: post:tiktok:tt-post-008, product:UG-PRD-104
  - Duration: 0 ms
- Tool: getProduct
  - Outcome: found
  - Args: {"productId":"UG-PRD-104"}
  - Evidence: product:UG-PRD-104
  - Duration: 0 ms
- Tool: checkInventory
  - Outcome: found
  - Args: {"productId":"UG-PRD-104"}
  - Evidence: product:UG-PRD-104#standard-4pack
  - Duration: 0 ms

### LB-009
- Route: clarification
- Evidence: post:facebook:fb-post-009, product:UG-PRD-105, product:UG-PRD-103, product:UG-PRD-106
- Tool: findProductByPost
  - Outcome: not_found
  - Args: {"channel":"facebook","postId":"fb-post-009"}
  - Evidence: post:facebook:fb-post-009
  - Duration: 0 ms
- Tool: searchCatalogue
  - Outcome: found
  - Args: {"query":"do you still have the same one from the last post"}
  - Evidence: product:UG-PRD-105, product:UG-PRD-103, product:UG-PRD-106
  - Duration: 1 ms

### LB-010
- Route: variant
- Evidence: post:instagram:ig-post-010, product:UG-PRD-103
- Tool: findProductByPost
  - Outcome: found
  - Args: {"channel":"instagram","postId":"ig-post-010"}
  - Evidence: post:instagram:ig-post-010, product:UG-PRD-103
  - Duration: 0 ms
- Tool: getProduct
  - Outcome: found
  - Args: {"productId":"UG-PRD-103"}
  - Evidence: product:UG-PRD-103
  - Duration: 0 ms
- Tool: getProduct
  - Outcome: found
  - Args: {"productId":"UG-PRD-103"}
  - Evidence: product:UG-PRD-103
  - Duration: 0 ms

### LB-011
- Route: order_capture
- Evidence: product:UG-PRD-105, product:UG-PRD-103, product:UG-PRD-106
- Tool: searchCatalogue
  - Outcome: found
  - Args: {"query":"please send the invoice for 3 toner packs i will pay today"}
  - Evidence: product:UG-PRD-105, product:UG-PRD-103, product:UG-PRD-106
  - Duration: 1 ms

### LB-012
- Route: compliment
- Evidence: post:tiktok:tt-post-012, product:UG-PRD-106
- Tool: findProductByPost
  - Outcome: not_found
  - Args: {"channel":"tiktok","postId":"tt-post-012"}
  - Evidence: post:tiktok:tt-post-012
  - Duration: 0 ms
- Tool: searchCatalogue
  - Outcome: found
  - Args: {"query":"your posts are really polished nice work"}
  - Evidence: product:UG-PRD-106
  - Duration: 0 ms
- Tool: getProduct
  - Outcome: found
  - Args: {"productId":"UG-PRD-106"}
  - Evidence: product:UG-PRD-106
  - Duration: 0 ms

### LB-013
- Route: spam
- Evidence: post:facebook:fb-post-013
- Tool: findProductByPost
  - Outcome: not_found
  - Args: {"channel":"facebook","postId":"fb-post-013"}
  - Evidence: post:facebook:fb-post-013
  - Duration: 0 ms

### LB-014
- Route: complaint
- Evidence: post:instagram:ig-post-014, product:UG-PRD-101
- Tool: findProductByPost
  - Outcome: found
  - Args: {"channel":"instagram","postId":"ig-post-014"}
  - Evidence: post:instagram:ig-post-014, product:UG-PRD-101
  - Duration: 0 ms
- Tool: getProduct
  - Outcome: found
  - Args: {"productId":"UG-PRD-101"}
  - Evidence: product:UG-PRD-101
  - Duration: 0 ms

### LB-015
- Route: phone_handoff
- Evidence: none

### LB-016
- Route: prompt_injection
- Evidence: post:facebook:fb-post-016
- Tool: findProductByPost
  - Outcome: not_found
  - Args: {"channel":"facebook","postId":"fb-post-016"}
  - Evidence: post:facebook:fb-post-016
  - Duration: 0 ms

### LB-017
- Route: unsupported_price_claim
- Evidence: post:instagram:ig-post-017, product:UG-PRD-106, policy:NEG-106
- Tool: findProductByPost
  - Outcome: found
  - Args: {"channel":"instagram","postId":"ig-post-017"}
  - Evidence: post:instagram:ig-post-017, product:UG-PRD-106
  - Duration: 0 ms
- Tool: getProduct
  - Outcome: found
  - Args: {"productId":"UG-PRD-106"}
  - Evidence: product:UG-PRD-106
  - Duration: 0 ms
- Tool: getNegotiationPolicy
  - Outcome: found
  - Args: {"productId":"UG-PRD-106","quantity":8}
  - Evidence: policy:NEG-106
  - Duration: 0 ms

### LB-018
- Route: unsupported_price_claim
- Evidence: product:UG-PRD-106, product:UG-PRD-102, product:UG-PRD-108
- Tool: searchCatalogue
  - Outcome: found
  - Args: {"query":"another seller quoted me 8 000 for the same led lamp so you must match it"}
  - Evidence: product:UG-PRD-106, product:UG-PRD-102, product:UG-PRD-108
  - Duration: 1 ms

### LB-019
- Route: negotiation
- Evidence: post:facebook:fb-post-019, product:UG-PRD-107, policy:NEG-107
- Tool: findProductByPost
  - Outcome: found
  - Args: {"channel":"facebook","postId":"fb-post-019"}
  - Evidence: post:facebook:fb-post-019, product:UG-PRD-107
  - Duration: 0 ms
- Tool: getProduct
  - Outcome: found
  - Args: {"productId":"UG-PRD-107"}
  - Evidence: product:UG-PRD-107
  - Duration: 0 ms
- Tool: getNegotiationPolicy
  - Outcome: found
  - Args: {"productId":"UG-PRD-107","quantity":180}
  - Evidence: policy:NEG-107
  - Duration: 0 ms

### LB-020
- Route: negotiation
- Evidence: post:instagram:ig-post-020, product:UG-PRD-108, product:UG-PRD-108#blue-750ml, policy:NEG-108, delivery:DEL-JIN-001:Jinja Town, policy:NEG-108
- Tool: findProductByPost
  - Outcome: found
  - Args: {"channel":"instagram","postId":"ig-post-020"}
  - Evidence: post:instagram:ig-post-020, product:UG-PRD-108
  - Duration: 0 ms
- Tool: getProduct
  - Outcome: found
  - Args: {"productId":"UG-PRD-108"}
  - Evidence: product:UG-PRD-108
  - Duration: 0 ms
- Tool: checkInventory
  - Outcome: found
  - Args: {"productId":"UG-PRD-108","requestedVariant":"blue"}
  - Evidence: product:UG-PRD-108#blue-750ml
  - Duration: 0 ms
- Tool: getNegotiationPolicy
  - Outcome: found
  - Args: {"productId":"UG-PRD-108","quantity":24}
  - Evidence: policy:NEG-108
  - Duration: 0 ms
- Tool: checkInventory
  - Outcome: found
  - Args: {"productId":"UG-PRD-108","requestedVariant":"blue"}
  - Evidence: product:UG-PRD-108#blue-750ml
  - Duration: 0 ms
- Tool: getDeliveryOptions
  - Outcome: found
  - Args: {"destination":"Jinja Town"}
  - Evidence: delivery:DEL-JIN-001:Jinja Town
  - Duration: 0 ms

## Notes

- This iteration isolates verified tools and synthetic data, not model reasoning.
- The frozen baseline report remains unchanged.
