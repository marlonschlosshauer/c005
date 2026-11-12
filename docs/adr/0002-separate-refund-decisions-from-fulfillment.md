# Separate refund decisions from fulfillment

A refund decision permanently resolves one specific refund request: that decision cannot be changed. Rejection allows the purchaser to submit a new request for the same seat, subject to submission eligibility; approval blocks further requests for that seat, even when the approved amount is partial or payment is still pending.

Approval authorizes a refund but does not confirm that money has been returned. Payment execution and its statuses belong to a separate model, and only successful refund payment removes the seat's access, including for partial refunds; this keeps payment failures from undoing decisions or removing access before money is returned. Purchasers are notified of decisions by email, but delivery failures and retries belong to the email service and do not affect the decision.

The decision-screen feature includes the supporting data changes needed to identify the requested seat, establish its paid amount, and record the decision correctly. Payment fulfillment and email delivery are separate service work.
