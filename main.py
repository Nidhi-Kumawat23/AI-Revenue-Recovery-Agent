import os
from datetime import datetime
from pathlib import Path
from typing import Optional

import pandas as pd
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from google import genai

from payment_service import create_order, verify_payment
from recovery_engine import decide_recovery

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
load_dotenv(BASE_DIR / ".env")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID")
client = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None

app = FastAPI(title="PayRecover AI - Payment Recovery Agent", version="2.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str
    transaction_id: Optional[str] = None

class RecoveryOrderRequest(BaseModel):
    transaction_id: str

class PaymentVerificationRequest(BaseModel):
    transaction_id: str
    payment_id: str
    order_id: str
    signature: str


def find_dataset() -> Path:
    preferred = DATA_DIR / "payment_transactions.csv"
    if preferred.exists():
        return preferred
    csv_files = list(DATA_DIR.glob("*.csv"))
    if csv_files:
        return csv_files[0]
    root_csv = list(BASE_DIR.glob("*.csv"))
    if root_csv:
        return root_csv[0]
    raise HTTPException(500, "Payment transaction CSV not found in backend/data.")


def load_payments() -> pd.DataFrame:
    try:
        df = pd.read_csv(find_dataset())
    except Exception as exc:
        raise HTTPException(500, f"Unable to load dataset: {exc}")
    if "transaction_id" not in df.columns:
        raise HTTPException(500, "Dataset must contain transaction_id.")
    return df


def save_payments(df: pd.DataFrame) -> None:
    try:
        df.to_csv(find_dataset(), index=False)
    except Exception as exc:
        raise HTTPException(500, f"Unable to update dataset: {exc}")


def get_transaction(df: pd.DataFrame, transaction_id: str):
    tx = str(transaction_id).strip().upper()
    matches = df[df["transaction_id"].astype(str).str.strip().str.upper() == tx]
    if matches.empty:
        raise HTTPException(404, f"Transaction {tx} not found.")
    index = matches.index[0]
    return index, df.loc[index].to_dict()


def val(value):
    return "" if pd.isna(value) else value


def transaction_payload(tx: dict) -> dict:
    return {
        "transaction_id": str(val(tx.get("transaction_id"))),
        "customer_id": str(val(tx.get("customer_id"))),
        "timestamp": str(val(tx.get("timestamp"))),
        "amount": float(val(tx.get("amount")) or 0),
        "payment_method": str(val(tx.get("payment_method"))),
        "gateway": str(val(tx.get("gateway"))),
        "merchant_category": str(val(tx.get("merchant_category"))),
        "status": str(val(tx.get("status"))).upper(),
        "failure_reason": str(val(tx.get("failure_reason"))),
        "failure_code": str(val(tx.get("failure_code"))),
        "retry_count": int(float(val(tx.get("retry_count")) or 0)),
        "previous_failed_payments": int(float(val(tx.get("previous_failed_payments")) or 0)),
        "previous_successful_payments": int(float(val(tx.get("previous_successful_payments")) or 0)),
        "customer_risk": str(val(tx.get("customer_risk"))),
        "recommended_action": str(val(tx.get("recommended_action"))),
        "recovery_priority": str(val(tx.get("recovery_priority"))),
        "recovery_channel": str(val(tx.get("recovery_channel"))),
        "recovery_status": str(val(tx.get("recovery_status"))).upper(),
    }


@app.get("/")
def home():
    return {"message": "PayRecover AI Payment Recovery API is running.", "version": "2.0.0"}


@app.get("/health")
def health():
    return {
        "backend": "online",
        "gemini_configured": bool(GEMINI_API_KEY),
        "razorpay_configured": bool(RAZORPAY_KEY_ID),
        "dataset": find_dataset().name,
    }


@app.get("/dashboard/stats")
def dashboard_stats():
    df = load_payments()
    status = df["status"].astype(str).str.upper().str.strip()
    total = len(df)
    failed = int((status == "FAILED").sum())
    recovered = 0
    if "recovery_status" in df.columns:
        recovery_status = df["recovery_status"].astype(str).str.upper().str.strip()
        recovered = int(recovery_status.isin(["RECOVERED", "PAYMENT_SUCCESS", "SUCCESS"]).sum())
    rate = round((recovered / failed) * 100, 2) if failed else 0.0
    return {
        "total_transactions": total,
        "failed_payments": failed,
        "recovered_payments": recovered,
        "recovery_rate": rate,
    }


@app.get("/transactions")
def transactions(status: str = "FAILED", limit: int = 100):
    df = load_payments()
    wanted = status.upper().strip()
    if wanted in {"FAILED", "SUCCESS"}:
        df = df[df["status"].astype(str).str.upper().str.strip() == wanted]
    limit = max(1, min(limit, 200))
    return {"transactions": [transaction_payload(r) for _, r in df.head(limit).iterrows()]}


@app.get("/transaction/{transaction_id}")
def transaction_details(transaction_id: str):
    _, tx = get_transaction(load_payments(), transaction_id)
    return transaction_payload(tx)


@app.post("/recovery/execute/{transaction_id}")
def recover_payment(transaction_id: str):
    df = load_payments()
    index, raw = get_transaction(df, transaction_id)
    tx = transaction_payload(raw)
    decision = decide_recovery(tx)
    now = datetime.now().isoformat(timespec="seconds")

    audit = [
        {"timestamp": now, "step": "TRANSACTION_ANALYZED", "details": {
            "status": tx["status"], "failure_reason": tx["failure_reason"] or "None", "amount": tx["amount"]
        }},
        {"timestamp": now, "step": "ROOT_CAUSE_IDENTIFIED", "details": tx["failure_reason"] or "No failure - payment already successful"},
        {"timestamp": now, "step": "RECOVERY_DECISION", "details": decision["action"]},
    ]

    action = decision["action"]
    if tx["status"] == "SUCCESS":
        execution_status = "NOT_REQUIRED"
    elif action == "RETRY_PAYMENT":
        execution_status = "RETRY_READY"
    elif action == "SWITCH_GATEWAY":
        execution_status = "GATEWAY_SWITCH_RECOMMENDED"
    elif action == "ALTERNATIVE_PAYMENT_METHOD":
        execution_status = "ALTERNATIVE_METHOD_REQUIRED"
    elif action == "RETRY_LATER":
        execution_status = "RETRY_SCHEDULED"
    elif action == "MONITOR_PAYMENT":
        execution_status = "MONITORING_STARTED"
    else:
        execution_status = "HUMAN_ESCALATION"

    if tx["status"] == "FAILED" and "recovery_status" in df.columns:
        current = str(df.at[index, "recovery_status"]).upper()
        if current not in {"RECOVERED", "PAYMENT_SUCCESS", "SUCCESS"}:
            df.at[index, "recovery_status"] = "RECOVERY_RECOMMENDED"
            save_payments(df)

    audit.append({
        "timestamp": datetime.now().isoformat(timespec="seconds"),
        "step": "RECOVERY_DECISION_RECORDED",
        "details": execution_status,
    })

    return {
        **tx,
        "recovery_decision": decision,
        "recovery_result": {"action": action, "status": execution_status},
        "audit_trail": audit,
    }


@app.post("/recovery/create-order")
def create_recovery_order(request: RecoveryOrderRequest):
    df = load_payments()
    index, raw = get_transaction(df, request.transaction_id)
    tx = transaction_payload(raw)
    if tx["status"] == "SUCCESS":
        raise HTTPException(400, "This transaction is already successful.")

    result = create_order(tx["amount"], "INR", f"recovery_{tx['transaction_id']}")
    if not result.get("success"):
        raise HTTPException(500, result.get("error", "Unable to create Razorpay order."))

    if "recovery_status" in df.columns:
        df.at[index, "recovery_status"] = "ORDER_CREATED"
        save_payments(df)

    return {
        "transaction_id": tx["transaction_id"],
        "original_amount": tx["amount"],
        "recovery_order": result["order"],
        "razorpay_key_id": RAZORPAY_KEY_ID,
        "message": "Razorpay recovery order created successfully.",
    }


@app.post("/recovery/verify-payment")
def recovery_verify_payment(request: PaymentVerificationRequest):
    df = load_payments()
    index, _ = get_transaction(df, request.transaction_id)
    result = verify_payment(request.payment_id, request.order_id, request.signature)
    if not result.get("success"):
        raise HTTPException(400, result.get("error", "Payment verification failed."))

    if "recovery_status" in df.columns:
        df.at[index, "recovery_status"] = "RECOVERED"
        save_payments(df)

    return {
        "message": "Payment status verified successfully.",
        "payment": result,
        "transaction_id": request.transaction_id,
        "recovery_status": "RECOVERED",
    }


@app.post("/chat")
def chat(request: ChatRequest):
    message = request.message.strip()
    if not message:
        raise HTTPException(400, "Message cannot be empty.")
    if not client:
        raise HTTPException(500, "Gemini API key is not configured in backend/.env")

    context = "No transaction selected."
    if request.transaction_id and request.transaction_id.strip():
        _, raw = get_transaction(load_payments(), request.transaction_id)
        tx = transaction_payload(raw)
        context = f"""
Selected transaction:
Transaction ID: {tx['transaction_id']}
Status: {tx['status']}
Amount: INR {tx['amount']}
Payment method: {tx['payment_method']}
Gateway: {tx['gateway']}
Failure reason: {tx['failure_reason'] or 'None'}
Failure code: {tx['failure_code'] or 'None'}
Retry count: {tx['retry_count']}
Customer risk: {tx['customer_risk']}
Recommended action: {tx['recommended_action']}
Recovery priority: {tx['recovery_priority']}
Recovery channel: {tx['recovery_channel']}
Recovery status: {tx['recovery_status']}
"""

    prompt = f"""
You are PayRecover AI, an AI payment recovery assistant.
Answer clearly and briefly. Support English and natural Indian Hinglish.
The user can ask general payment questions without selecting a transaction.
If transaction context is supplied, use only those facts and never invent details.
Explain payment failures, root causes, recovery actions, Razorpay test-mode flow, and status.
Never claim a payment is recovered unless the context says RECOVERED.
This product has no PDF feature, so do not discuss PDF analysis.

{context}

User question:
{message}
"""

    try:
        response = client.models.generate_content(model="gemini-3.6-flash", contents=prompt)
        return {"reply": response.text or "I could not generate a response."}
    except Exception as exc:
        raise HTTPException(500, f"Gemini error: {exc}")
