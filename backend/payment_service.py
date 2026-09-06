import os
import razorpay
from dotenv import load_dotenv

load_dotenv()
RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET")
client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET)) if RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET else None


def create_order(amount: float, currency: str = "INR", receipt: str = ""):
    if not client:
        return {"success": False, "error": "Razorpay keys are missing in backend/.env"}
    try:
        order = client.order.create({"amount": int(round(float(amount) * 100)), "currency": currency, "receipt": receipt[:40]})
        return {"success": True, "order": order}
    except Exception as exc:
        return {"success": False, "error": str(exc)}


def verify_payment(payment_id: str, order_id: str, signature: str):
    if not client:
        return {"success": False, "error": "Razorpay keys are missing in backend/.env"}
    try:
        client.utility.verify_payment_signature({
            "razorpay_order_id": order_id,
            "razorpay_payment_id": payment_id,
            "razorpay_signature": signature,
        })
        payment = client.payment.fetch(payment_id)
        return {
            "success": True,
            "payment_id": payment_id,
            "order_id": order_id,
            "status": payment.get("status"),
            "method": payment.get("method"),
            "amount": payment.get("amount"),
            "currency": payment.get("currency"),
        }
    except Exception as exc:
        return {"success": False, "error": str(exc)}
