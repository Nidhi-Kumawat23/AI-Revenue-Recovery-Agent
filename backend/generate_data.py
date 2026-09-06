import pandas as pd
import numpy as np
import random
import os
from datetime import datetime, timedelta

# -----------------------------
# SETTINGS
# -----------------------------
NUM_RECORDS = 30000

random.seed(42)
np.random.seed(42)

# -----------------------------
# OPTIONS
# -----------------------------
payment_methods = [
    "UPI",
    "Credit Card",
    "Debit Card",
    "Net Banking",
    "Wallet"
]

gateways = [
    "Razorpay",
    "Gateway_A",
    "Gateway_B"
]

merchant_categories = [
    "Ecommerce",
    "Food",
    "Education",
    "Travel",
    "Healthcare",
    "Utilities",
    "Subscription"
]

failure_reasons = [
    "Insufficient Funds",
    "Bank Declined",
    "Gateway Timeout",
    "Network Error",
    "OTP Failure",
    "Payment Gateway Error",
    "Daily Limit Exceeded",
    "Technical Error"
]

failure_codes = [
    "INSUFFICIENT_FUNDS",
    "BANK_DECLINED",
    "TIMEOUT",
    "NETWORK_ERROR",
    "OTP_FAILED",
    "GATEWAY_ERROR",
    "LIMIT_EXCEEDED",
    "TECH_ERROR"
]

# -----------------------------
# DATE RANGE
# -----------------------------
start_date = datetime(2026, 1, 1)

# -----------------------------
# GENERATE DATA
# -----------------------------
data = []

for i in range(NUM_RECORDS):

    transaction_id = f"TXN{i+1:07d}"

    customer_id = f"CUST{random.randint(1, 8000):05d}"

    amount = round(
        np.random.lognormal(mean=6.5, sigma=1.0),
        2
    )

    # Keep amounts realistic
    amount = min(max(amount, 50), 100000)

    payment_method = random.choice(payment_methods)

    gateway = random.choice(gateways)

    merchant_category = random.choice(merchant_categories)

    timestamp = start_date + timedelta(
        days=random.randint(0, 240),
        minutes=random.randint(0, 1439)
    )

    # -----------------------------
    # PAYMENT STATUS
    # -----------------------------

    status_probability = random.random()

    if status_probability < 0.72:
        status = "SUCCESS"
        failure_reason = None
        failure_code = None

    elif status_probability < 0.92:
        status = "FAILED"

        failure_index = random.randrange(len(failure_reasons))

        failure_reason = failure_reasons[failure_index]
        failure_code = failure_codes[failure_index]

    else:
        status = "PENDING"
        failure_reason = None
        failure_code = None

    # -----------------------------
    # RETRY HISTORY
    # -----------------------------

    if status == "SUCCESS":
        retry_count = random.choice([0, 0, 0, 1])

    elif status == "FAILED":
        retry_count = random.randint(0, 3)

    else:
        retry_count = random.randint(0, 2)

    # -----------------------------
    # CUSTOMER HISTORY
    # -----------------------------

    previous_failed_payments = random.randint(0, 6)

    previous_successful_payments = random.randint(1, 30)

    # -----------------------------
    # CUSTOMER RISK
    # -----------------------------

    if previous_failed_payments >= 5:
        customer_risk = "HIGH"

    elif previous_failed_payments >= 3:
        customer_risk = "MEDIUM"

    else:
        customer_risk = "LOW"

    # -----------------------------
    # RECOVERY LOGIC
    # -----------------------------
    # This is the initial simulated recovery
    # label. Our AI agent will later make
    # its own decision using the transaction data.

    if status == "SUCCESS":

        recommended_action = "NO_ACTION"
        recovery_priority = "NONE"

    elif failure_reason == "Insufficient Funds":

        recommended_action = "USE_ALTERNATIVE_PAYMENT_METHOD"
        recovery_priority = "HIGH"

    elif failure_reason == "Bank Declined":

        recommended_action = "RETRY_LATER"
        recovery_priority = "HIGH"

    elif failure_reason == "Gateway Timeout":

        recommended_action = "RETRY_PAYMENT"
        recovery_priority = "HIGH"

    elif failure_reason == "Network Error":

        recommended_action = "RETRY_PAYMENT"
        recovery_priority = "MEDIUM"

    elif failure_reason == "OTP Failure":

        recommended_action = "RETRY_PAYMENT"
        recovery_priority = "MEDIUM"

    elif failure_reason == "Payment Gateway Error":

        recommended_action = "SWITCH_GATEWAY"
        recovery_priority = "HIGH"

    elif failure_reason == "Daily Limit Exceeded":

        recommended_action = "USE_ALTERNATIVE_PAYMENT_METHOD"
        recovery_priority = "HIGH"

    elif failure_reason == "Technical Error":

        recommended_action = "RETRY_LATER"
        recovery_priority = "MEDIUM"

    else:

        recommended_action = "MONITOR"
        recovery_priority = "LOW"

    # -----------------------------
    # RECOVERY CHANNEL
    # -----------------------------

    if recommended_action == "NO_ACTION":
        recovery_channel = "NONE"

    elif amount >= 20000:
        recovery_channel = "HUMAN_ESCALATION"

    elif customer_risk == "HIGH":
        recovery_channel = "VOICE_ASSISTANT"

    else:
        recovery_channel = random.choice([
            "IN_APP",
            "SMS",
            "EMAIL",
            "VOICE_ASSISTANT"
        ])

    # -----------------------------
    # RECOVERY STATUS
    # -----------------------------

    if status == "SUCCESS":

        recovery_status = "NOT_REQUIRED"

    elif random.random() < 0.55:

        recovery_status = "RECOVERED"

    else:

        recovery_status = "PENDING"

    # -----------------------------
    # ADD RECORD
    # -----------------------------

    data.append({

        "transaction_id": transaction_id,

        "customer_id": customer_id,

        "timestamp": timestamp,

        "amount": amount,

        "payment_method": payment_method,

        "gateway": gateway,

        "merchant_category": merchant_category,

        "status": status,

        "failure_reason": failure_reason,

        "failure_code": failure_code,

        "retry_count": retry_count,

        "previous_failed_payments": previous_failed_payments,

        "previous_successful_payments": previous_successful_payments,

        "customer_risk": customer_risk,

        "recommended_action": recommended_action,

        "recovery_priority": recovery_priority,

        "recovery_channel": recovery_channel,

        "recovery_status": recovery_status
    })


# -----------------------------
# CREATE DATAFRAME
# -----------------------------

df = pd.DataFrame(data)

# -----------------------------
# CREATE DATA FOLDER
# -----------------------------

os.makedirs("data", exist_ok=True)

# -----------------------------
# SAVE CSV
# -----------------------------

file_path = "data/payment_transactions.csv"

df.to_csv(file_path, index=False)

# -----------------------------
# DISPLAY RESULTS
# -----------------------------

print("\n====================================")
print(" PAYMENT DATASET CREATED")
print("====================================")

print(f"File: {file_path}")

print(f"Rows: {len(df)}")

print(f"Columns: {len(df.columns)}")

print("\nColumns:")

print(df.columns.tolist())

print("\nPayment Status:")

print(df["status"].value_counts())

print("\nFailure Reasons:")

print(df["failure_reason"].value_counts(dropna=True))

print("\nRecovery Actions:")

print(df["recommended_action"].value_counts())

print("\nFirst 5 records:")

print(df.head())

print("\n====================================")
print("DONE!")
print("====================================")