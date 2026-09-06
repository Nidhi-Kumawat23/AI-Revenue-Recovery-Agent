def decide_recovery(transaction: dict) -> dict:
    status = str(transaction.get("status", "")).upper()
    reason = str(transaction.get("failure_reason", "")).strip().lower()
    retry_count = int(float(transaction.get("retry_count", 0) or 0))

    if status == "SUCCESS":
        return {"action": "NO_ACTION", "reason": "Payment is already successful."}
    if "daily limit" in reason or "limit exceeded" in reason:
        return {"action": "ALTERNATIVE_PAYMENT_METHOD", "reason": "Payment limit was exceeded. Use another payment method."}
    if any(x in reason for x in ["network", "timeout", "temporary"]):
        if retry_count < 2:
            return {"action": "RETRY_PAYMENT", "reason": "A temporary network issue was detected. A retry is appropriate."}
        return {"action": "RETRY_LATER", "reason": "Multiple retries have already occurred. Retry later to avoid repeated failure."}
    if any(x in reason for x in ["gateway", "processor", "server", "service unavailable"]):
        return {"action": "SWITCH_GATEWAY", "reason": "The payment gateway appears unavailable. Try another gateway."}
    if any(x in reason for x in ["insufficient", "balance"]):
        return {"action": "ALTERNATIVE_PAYMENT_METHOD", "reason": "The available balance may be insufficient. Use another payment method."}
    if any(x in reason for x in ["expired", "authentication", "otp", "3d secure"]):
        return {"action": "RETRY_PAYMENT", "reason": "The payment authentication/session may have expired. Retry the payment."}
    if retry_count >= 3:
        return {"action": "HUMAN_ESCALATION", "reason": "Several retries have failed. Human review is recommended."}
    return {"action": "MONITOR_PAYMENT", "reason": "The failure reason does not match a specific automatic recovery rule."}
