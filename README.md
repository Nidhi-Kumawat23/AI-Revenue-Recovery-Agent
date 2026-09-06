# 💳 Payment Recovery AI Agent

An AI-powered payment recovery system developed for the **Razorpay AI Buildathon – Track 3: Payment Recovery**.

The project analyzes failed payment transactions, identifies possible failure reasons, recommends an appropriate recovery action, provides an AI assistant for payment-related queries, and demonstrates payment recovery using Razorpay Test Mode.

---

# 🎯 Project Objective

The main objective of this project is to build an intelligent payment recovery system that can help businesses reduce revenue loss caused by failed payments.

The system aims to:

- Detect and analyze failed payments.
- Identify possible reasons for payment failure.
- Use an AI Recovery Agent to recommend the best recovery action.
- Automate the recovery process where possible.
- Integrate Razorpay Checkout for payment recovery.
- Verify successful payments before marking them as recovered.
- Track recovery activities using an audit trail.
- Provide an AI chatbot for payment-related questions.
- Support English and Hinglish conversations.
- Provide optional voice input and voice output.
- Display recovery statistics through a live dashboard.

### One-Line Objective

> To build an AI-powered payment recovery system that detects payment failures, recommends intelligent recovery actions, executes recovery through Razorpay, and tracks successful recovery in real time.

---

# 🚨 Problem Statement

Payment failures are common in digital transactions and can directly result in lost revenue.

When a payment fails, businesses need to determine:

- Why did the payment fail?
- Should the customer retry?
- Should another payment method be suggested?
- Should another gateway be used?
- Should the payment be attempted later?

Handling these decisions manually can be slow and inconsistent.

There is a need for an intelligent system that can analyze failed transactions and recommend the most appropriate recovery strategy.

---

# 💡 Proposed Solution

The Payment Recovery AI Agent analyzes failed transactions and creates a recovery decision based on the available transaction and failure information.

The system follows this flow:

```
Failed Payment
      ↓
Transaction Analysis
      ↓
Failure Reason Identification
      ↓
AI Recovery Decision
      ↓
Recommended Recovery Action
      ↓
Razorpay Recovery Checkout
      ↓
Payment Verification
      ↓
Recovery Status Updated
      ↓
Dashboard Updated
```
--- 
# 🤖 What is the Recovery Agent?

The Recovery Agent is the decision-making component of the project.
It is different from a normal chatbot.
A chatbot mainly communicates with users and answers questions.
The Recovery Agent works on a failed transaction and decides:

```
What happened?
      ↓
Why did it happen?
      ↓
What should be done?
      ↓
How can the payment be recovered?
```
#### The agent can recommend actions such as:
#### RETRY_PAYMENT
#### ALTERNATIVE_PAYMENT_METHOD
#### SWITCH_GATEWAY
#### RETRY_LATER
#### This makes the system an action-oriented payment recovery solution, rather than only a conversational AI.
---
# 🧠 AI Recovery Assistant
The project includes a conversational AI assistant powered by Google Gemini.
The chatbot can answer general payment-related questions even when no transaction is selected.
Examples:
```
What is payment recovery?

Why do payments fail?

What is a payment gateway?

How can a failed payment be recovered?

What is Razorpay?
```
The chatbot can also answer questions related to a selected transaction.
For example:
```
Why did this payment fail?

What recovery action should be taken?

Payment fail kyu hota hai?

Is transaction ko kaise recover kar sakte hain?
```
The assistant supports both English and Hinglish interaction.
---
# 🎙️ Voice Assistant
The application includes optional voice interaction.

Voice Input
The user can click the microphone button and ask a question.
The browser converts the spoken question into text and sends it to the AI assistant.
Example:
```
User speaks:
"Payment fail kyu hota hai?"

        ↓

Speech converted to text

        ↓

Gemini AI

        ↓

AI Response
```
#### Voice Output
#### The AI response is not automatically spoken.
#### The user can click the:
#### 🔊 Speak
#### button when they want the AI response to be read aloud.
#### This makes voice interaction optional and user-controlled.
---
# 💳 Razorpay Integration
The project integrates Razorpay Test Mode to demonstrate the actual payment recovery flow.
After the Recovery Agent recommends a suitable recovery action, the system can create a Razorpay recovery order.
The user can then open Razorpay Checkout and complete a test payment.
The payment response is sent back to the backend for verification.
```
Recovery Decision
       ↓
Create Razorpay Order
       ↓
Razorpay Checkout
       ↓
Test Payment
       ↓
Payment Response
       ↓
Backend Verification
       ↓
RECOVERED
```
#### The project uses Razorpay Test Mode for demonstration, so no real money is required.
---
# 🔐 Payment Verification
The backend verifies the Razorpay payment before changing the transaction status to recovered.
The system receives payment information such as:
Payment ID
Order ID
Payment signature
Transaction ID
After successful verification:
```
Payment Verification Successful
              ↓
Recovery Status = RECOVERED
              ↓
Dashboard Statistics Updated
```
#### This prevents the system from simply marking a payment as recovered without verification.
---
# 📊 Dashboard
The project provides a dashboard for monitoring payment recovery.
The dashboard displays:
Total Transactions
Failed Payments
Recovered Payments
Recovery Rate
The statistics are loaded from the backend and update after recovery activity.
Example:
```
┌──────────────────────┐
│ Total Transactions   │
│        30000         │
└──────────────────────┘

┌──────────────────────┐
│ Failed Payments      │
│         5000         │
└──────────────────────┘

┌──────────────────────┐
│ Recovered Payments   │
│         2340         │
└──────────────────────┘

┌──────────────────────┐
│ Recovery Rate        │
│        46.8%         │
└──────────────────────┘
```
#### The actual values are loaded dynamically from the backend.
---
# 🔍 Recovery Audit Trail
The system maintains an audit trail for the recovery process.
Example:
```
Transaction Received
        ↓
Payment Failure Analyzed
        ↓
Recovery Decision Generated
        ↓
Recovery Action Selected
        ↓
Razorpay Order Created
        ↓
Payment Completed
        ↓
Payment Verified
        ↓
Transaction Recovered
```
#### The audit trail improves transparency and allows the user to understand how the recovery process progressed.
---
# 🏗️ System Architecture
   ```
                         ┌──────────────────┐
                         │       USER       │
                         └────────┬─────────┘
                                  │
                                  ▼
                    ┌─────────────────────────┐
                    │     React Frontend      │
                    │   Dashboard + Interface │
                    └───────────┬─────────────┘
                                │
             ┌──────────────────┼──────────────────┐
             │                  │                  │
             ▼                  ▼                  ▼
    ┌────────────────┐ ┌────────────────┐ ┌────────────────┐
    │ Transaction    │ │ Gemini AI      │ │ Voice          │
    │ Analysis       │ │ Assistant      │ │ Assistant      │
    └───────┬────────┘ └────────────────┘ └────────────────┘
            │
            ▼
    ┌────────────────────────┐
    │     Recovery Agent     │
    │   Decision Engine      │
    └───────────┬────────────┘
                │
                ▼
    ┌────────────────────────┐
    │   Recovery Action       │
    └───────────┬────────────┘
                │
                ▼
    ┌────────────────────────┐
    │ Razorpay Test Checkout  │
    └───────────┬────────────┘
                │
                ▼
    ┌────────────────────────┐
    │ Payment Verification    │
    └───────────┬────────────┘
                │
                ▼
    ┌────────────────────────┐
    │    RECOVERED PAYMENT    │
    └────────────────────────┘
```

# 🔄 End-to-End Workflow
Step 1 — Transaction Input
The user enters a failed transaction ID.
Example:
TXN00000014
Step 2 — Transaction Analysis
The backend retrieves the transaction information and analyzes details such as:
Payment status
Amount
Payment method
Gateway
Failure reason
Failure code
Retry history
Customer risk
Previous payment history
Step 3 — Recovery Decision
The Recovery Agent evaluates the transaction and recommends an action.
Example:
```
Payment Status:
FAILED

Failure Reason:
Gateway / payment failure

AI Decision:
RETRY_PAYMENT
```
Step 4 — Recovery Execution
Depending on the recommended action, the system can create a Razorpay Test Mode recovery order.

Step 5 — Razorpay Checkout
The user clicks:
Open Razorpay Checkout
and completes the test payment.

Step 6 — Payment Verification
The backend receives the Razorpay payment response and verifies the payment.

Step 7 — Recovery Completed
After successful verification:
```
Recovery Status:
RECOVERED
```
#### The dashboard statistics are updated.
---
# 🛠️ Technology Stack
Frontend
React.js
Vite
JavaScript
HTML
CSS

Backend

Python
FastAPI
Uvicorn

Artificial Intelligence

Google Gemini API

Payment
Razorpay Test Mode
Razorpay Checkout

Voice
Web Speech API
Speech Recognition
Speech Synthesis

Data
Payment transaction dataset
Transaction recovery logic
---
# 📁 Project Structure
```
Payment-Recovery-AI/
│
├── backend/
│   ├── main.py
│   ├── recovery_engine.py
│   ├── transaction_data.py
│   ├── requirements.txt
│   └── .env
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── main.jsx
│   │   └── index.css
│   │
│   ├── public/
│   ├── index.html
│   ├── package.json
│   └── .env
│
├── .gitignore
└── README.md
```
---
# ⚙️ Installation

1. Clone the Repository
git clone YOUR_GITHUB_REPOSITORY_URL
cd Payment-Recovery-AI

## 🐍 Backend Setup
Open a terminal in the backend folder:
cd backend
Create a virtual environment:
python -m venv venv
Activate the virtual environment on Windows:
venv\Scripts\activate
Install the required packages:
pip install -r requirements.txt
Create a .env file inside the backend folder.
GEMINI_API_KEY=your_gemini_api_key
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret

Start the FastAPI backend:
uvicorn main:app --reload
The backend normally runs at:
http://127.0.0.1:8000

## ⚛️ Frontend Setup
Open another terminal:
cd frontend
Install dependencies:
npm install
Create a .env file inside the frontend folder:
VITE_API_URL=http://127.0.0.1:8000
Start the frontend:
npm run dev
Open the local URL displayed by Vite.

# 🔐 Environment Variables
API keys and secret keys must not be uploaded to GitHub.
Backend .env
GEMINI_API_KEY=your_gemini_api_key
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
Frontend .env
VITE_API_URL=http://127.0.0.1:8000
The .env file should be included in .gitignore.
Example:
.env
venv/
node_modules/
__pycache__/

---
# 🧪 Demo Flow
The complete project demonstration follows this flow:
```
Open Dashboard
       ↓
Enter Failed Transaction ID
       ↓
Analyze Payment
       ↓
Recovery Agent Analyzes Transaction
       ↓
AI Recovery Decision
       ↓
Recommended Recovery Action
       ↓
Open Razorpay Checkout
       ↓
Complete Test Payment
       ↓
Backend Verifies Payment
       ↓
Status Changes to RECOVERED
       ↓
Dashboard Statistics Update
```
# 💬 Chatbot Demo

The AI assistant can be used before selecting a transaction.
Example questions:
What is payment recovery?
Why do payments fail?
What is Razorpay?
Payment fail kyu hota hai?
After entering a transaction ID, users can also ask transaction-specific questions.
Example:
Why did this transaction fail?
What recovery action should I take?

---
# 🎙️ Voice Demo

#### The voice feature can be demonstrated by:
#### Opening the AI Recovery Assistant.
#### Clicking the microphone button.
#### Asking a question.
#### The speech is converted to text.
#### Gemini generates the response.
#### Clicking Speak reads the response aloud.
#### Voice output is optional and does not automatically play.
---
# 🌟 Key Features
```
Feature                       Description
AI Recovery Agent             Analyzes failed payments and recommends recovery actions
Failure Analysis              Identifies payment failure information
Recovery Decision             Selects an appropriate recovery strategy
Razorpay Integration          Provides test-mode recovery checkout
Payment Verification          Verifies the Razorpay payment
Recovery Status               Updates transaction to RECOVERED
Gemini AI                     Provides conversational payment assistance
Hinglish Support              Supports English and Hinglish questions
Voice Input                   Allows users to ask questions using voice
Voice Output                  Allows users to hear AI responses
Dashboard                     Displays recovery statistics
Audit Trail                   Shows the recovery process step-by-step

```
---
# 🔄 Recovery Actions

The system can recommend different recovery actions.
Retry Payment
Attempts the payment again.
Alternative Payment Method
Suggests another available payment method.
Switch Gateway
Attempts recovery through another payment gateway.
Retry Later
Schedules or recommends another attempt later.

---
# 📈 Recovery Metrics
The dashboard provides important recovery metrics:
```
Total Transactions
        ↓
Failed Payments
        ↓
Recovered Payments
        ↓
Recovery Rate
```
#### Recovery rate can be represented as:
#### Recovery Rate =
#### Recovered Payments / Failed Payments × 100

---
# 🛡️ Security

#### The project follows basic security practices for API credentials.
#### API keys are stored in environment variables.
#### Razorpay Secret Key is kept on the backend.
#### Secret keys are not exposed to the frontend.
#### .env files are excluded from GitHub.
#### Razorpay Test Mode is used for demonstration.
---

# 🧩 Challenges Faced

During development, several technical challenges were encountered.
1. Frontend and Backend Communication
Connecting React with the FastAPI backend required correct API URLs and proper request handling.
2. Razorpay Integration
Integrating Razorpay Checkout required implementing:
Order creation
Checkout initialization
Payment response handling
Backend payment verification
3. Recovery Status Updates
The dashboard initially required proper backend synchronization so that recovery information was reflected after payment processing.
4. AI Integration
Gemini AI needed to be integrated with the backend while keeping API credentials secure.
5. Voice Interaction
Voice input and optional speech output required browser Web Speech API integration.
6. Multiple Recovery Scenarios
Different payment failure reasons required different recovery decisions.
7. Error Handling
The application needed to handle:
Backend connection errors
Invalid transaction IDs
Failed payment verification
Razorpay checkout errors
AI API errors
Voice recognition errors
---
# 🧠 Technical Approach

The project uses a modular architecture.
```
Frontend
   ↓
FastAPI Backend
   ↓
Transaction Analysis
   ↓
Recovery Agent
   ↓
Recovery Decision
   ↓
Razorpay
   ↓
Payment Verification

```
#### The conversational AI works separately:
```
User Question
      ↓
React Chat Interface
      ↓
FastAPI /chat Endpoint
      ↓
Gemini AI
      ↓
AI Response
      ↓
Chat Interface
```
#### Voice interaction works as an additional interface:
```
Voice
  ↓
Speech Recognition
  ↓
Text
  ↓
AI Chatbot
  ↓
Response
  ↓
Optional Speech Synthesis
```
----
# 🎯 Razorpay Buildathon Track Alignment

This project is designed for:
Razorpay AI Buildathon — Track 3: Payment Recovery
The project focuses on the complete payment recovery cycle:
```
Payment Failure
       ↓
Root Cause Analysis
       ↓
Recovery Decision
       ↓
Recovery Action
       ↓
Payment Verification
       ↓
Successful Recovery

```
#### The key idea is to use an intelligent recovery agent to reduce manual intervention and improve the possibility of recovering failed #### payments.

---
# 🚀 Future Improvements

Future versions of the project could include:
Automatic payment retry scheduling
Intelligent gateway selection
Smart retry sequencing
Personalized customer recovery messages
WhatsApp recovery notifications
SMS recovery notifications
Subscription payment recovery
B2B receivables recovery
Advanced ML-based payment failure prediction
Production Razorpay integration
Multi-language voice support
Real-time analytics
Automated customer communication
Customer-specific recovery strategies

---
# 👩‍💻 Project Information

#### Project Name: Payment Recovery AI Agent
#### Buildathon: Razorpay AI Buildathon
#### Track: Track 3 — Payment Recovery
#### Developer: Nidhi Kumawat
#### Project Type: Individual Project
#### Application: AI-powered payment failure detection and recovery
---
# 📜 Disclaimer

This project is a hackathon prototype created for demonstration and educational purposes.
Razorpay integration is demonstrated using the Test Mode environment.
No real financial transactions are intended during the demonstration.

---
# ⭐ Summary

Payment Recovery AI Agent combines:
AI + Payment Analytics + Recovery Decision Making + Razorpay + Conversational AI + Voice Interaction
to create an intelligent system for handling failed payments.
The project demonstrates how an AI-powered recovery agent can move a failed payment from:
```
FAILED
  ↓
ANALYZED
  ↓
RECOVERY DECISION
  ↓
RECOVERY ACTION
  ↓
VERIFIED
  ↓
RECOVERED
Built as an individual project for the Razorpay AI Buildathon — Track 3: Payment Recovery.
