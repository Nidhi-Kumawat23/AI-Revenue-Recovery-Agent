# 💳 Payment Recovery AI Agent

An AI-powered payment recovery system built for the **Razorpay Buildathon – Track 3: Payment Recovery**.

The system analyzes failed payment transactions, identifies the likely reason for failure, recommends an appropriate recovery action, and provides a recovery flow through Razorpay test-mode checkout.

---

## 🚀 Project Overview

Payment failures can lead to lost revenue and frustrated customers.

This project introduces an **AI Payment Recovery Agent** that helps businesses understand failed transactions and decide what recovery action should be taken.

The system combines:

- Transaction data
- AI-based recovery decision making
- Razorpay payment recovery
- Gemini AI conversational assistant
- Voice input
- Optional voice output
- Recovery audit trail
- Real-time dashboard statistics

The goal is:

**Payment Failed → Understand Why → Decide What To Do → Recover Payment**

---

## 🎯 Problem Statement

When an online payment fails, businesses often need to manually determine:

- Why did the payment fail?
- Should the customer retry?
- Should another payment method be suggested?
- Should the payment be attempted later?
- Should another gateway be considered?

This manual process can result in delayed recovery and revenue loss.

Our solution automates this decision-making process using an AI-powered recovery agent.

---

## 💡 Solution

The Payment Recovery AI Agent takes a failed transaction as input and:

1. Identifies the transaction and payment details.
2. Analyzes the payment failure.
3. Determines a suitable recovery strategy.
4. Explains the reason behind the decision.
5. Creates a Razorpay test-mode recovery order when applicable.
6. Opens Razorpay Checkout for payment recovery.
7. Verifies the successful payment.
8. Updates the recovery status.
9. Maintains an audit trail of the recovery process.
10. Updates the dashboard statistics.

---

## 🤖 What is the Recovery Agent?

The **Recovery Agent** is the decision-making component of the system.

It is different from a normal chatbot.

A normal chatbot mainly answers user questions.

The Recovery Agent works on a transaction and decides:

**What happened? → Why did it happen? → What should we do next?**

For example:

```text
Failed Transaction
        ↓
Analyze Failure
        ↓
Identify Failure Reason
        ↓
Select Recovery Action
        ↓
Execute Recovery
        ↓
Verify Payment
        ↓
Recovered

                       ┌───────────────────┐
                       │       USER        │
                       └─────────┬─────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │    React Frontend      │
                    │    Dashboard + UI      │
                    └───────────┬────────────┘
                                │
                 ┌──────────────┼──────────────┐
                 │              │              │
                 ▼              ▼              ▼
        ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
        │ Transaction  │ │ Gemini AI    │ │ Voice        │
        │ Analysis     │ │ Assistant    │ │ Assistant    │
        └──────┬───────┘ └──────────────┘ └──────────────┘
               │
               ▼
        ┌──────────────────┐
        │ Recovery Agent   │
        │ Decision Engine  │
        └────────┬─────────┘
                 │
                 ▼
        ┌──────────────────┐
        │ Recovery Action  │
        └────────┬─────────┘
                 │
                 ▼
        ┌──────────────────┐
        │ Razorpay Test    │
        │ Mode Checkout    │
        └────────┬─────────┘
                 │
                 ▼
        ┌──────────────────┐
        │ Payment          │
        │ Verification     │
        └────────┬─────────┘
                 │
                 ▼
        ┌──────────────────┐
        │ RECOVERED        │
        └──────────────────┘
