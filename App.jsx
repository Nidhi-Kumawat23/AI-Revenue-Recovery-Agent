import { useEffect, useRef, useState } from "react";
import "./App.css";

const API = "http://127.0.0.1:8000";

const emptyStats = {
  total_transactions: 0,
  failed_payments: 0,
  recovered_payments: 0,
  recovery_rate: 0,
};

function App() {
  const [stats, setStats] = useState(emptyStats);
  const [transactionId, setTransactionId] = useState("");
  const [transactionOptions, setTransactionOptions] = useState([]);
  const [recovery, setRecovery] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [speakingIndex, setSpeakingIndex] = useState(null);

  const recognitionRef = useRef(null);

  const loadDashboard = async () => {
    try {
      const response = await fetch(`${API}/dashboard/stats`);
      const data = await response.json();
      if (response.ok) setStats(data);
    } catch {
      setMessage("Backend is not connected. Start FastAPI first.");
    }
  };

  const loadTransactionIds = async () => {
    try {
      const response = await fetch(`${API}/transactions?status=FAILED&limit=100`);
      const data = await response.json();
      if (response.ok) {
        const list = data.transactions || [];
        setTransactionOptions(list);
        if (!transactionId && list.length) {
          setTransactionId(list[0].transaction_id);
        }
      }
    } catch {
      // Dashboard error already explains connection problems.
    }
  };

  useEffect(() => {
    loadDashboard();
    loadTransactionIds();
    const timer = setInterval(loadDashboard, 5000);
    return () => clearInterval(timer);
  }, []);

  const analyzePayment = async () => {
    const id = transactionId.trim();
    if (!id) {
      setMessage("Please enter a Transaction ID.");
      return;
    }

    setLoading(true);
    setRecovery(null);
    setMessage("");

    try {
      const response = await fetch(`${API}/recovery/execute/${encodeURIComponent(id)}`, {
        method: "POST",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Transaction analysis failed.");
      }

      setRecovery(data);
      await loadDashboard();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  const waitForRazorpay = async () => {
    if (window.Razorpay) return true;
    for (let i = 0; i < 20; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 150));
      if (window.Razorpay) return true;
    }
    return false;
  };

  const openRazorpayCheckout = async () => {
    if (!recovery?.transaction_id) {
      setMessage("Analyze a failed transaction first.");
      return;
    }

    setMessage("");

    try {
      const response = await fetch(`${API}/recovery/create-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transaction_id: recovery.transaction_id }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Could not create Razorpay order.");
      }

      const loaded = await waitForRazorpay();
      if (!loaded) {
        throw new Error("Razorpay Checkout could not load. Check your internet connection and refresh.");
      }

      const order = data.recovery_order;
      const options = {
        key: data.razorpay_key_id,
        amount: order.amount,
        currency: order.currency,
        name: "PayRecover AI",
        description: `Recovery for ${recovery.transaction_id}`,
        order_id: order.id,
        prefill: {
          name: "PayRecover User",
          email: "demo@example.com",
          contact: "9999999999",
        },
        theme: { color: "#2563eb" },
        handler: async (paymentResponse) => {
          await verifyPayment(paymentResponse, recovery.transaction_id);
        },
        modal: {
          ondismiss: () => {
            setMessage("Checkout closed. The transaction remains pending recovery.");
          },
        },
      };

      const checkout = new window.Razorpay(options);
      checkout.on("payment.failed", (response) => {
        setMessage(response?.error?.description || "Test payment failed.");
      });
      checkout.open();
    } catch (error) {
      setMessage(error.message);
    }
  };

  const verifyPayment = async (paymentResponse, txId) => {
    try {
      const response = await fetch(`${API}/recovery/verify-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transaction_id: txId,
          payment_id: paymentResponse.razorpay_payment_id,
          order_id: paymentResponse.razorpay_order_id,
          signature: paymentResponse.razorpay_signature,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Payment verification failed.");

      setRecovery((prev) => ({
        ...prev,
        recovery_result: {
          ...(prev?.recovery_result || {}),
          action: "PAYMENT_RECOVERED",
          status: "RECOVERED",
        },
        payment_verification: data.payment,
      }));

      setMessage("Payment verified successfully. Transaction is now RECOVERED.");
      await loadDashboard();
    } catch (error) {
      setMessage(error.message);
    }
  };

  const sendChat = async (overrideMessage = null) => {
    const text = (overrideMessage ?? chatInput).trim();
    if (!text || chatLoading) return;

    setMessages((prev) => [...prev, { role: "user", text }]);
    setChatInput("");
    setChatLoading(true);

    try {
      const response = await fetch(`${API}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          transaction_id: transactionId.trim() || null,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Chatbot error.");

      setMessages((prev) => [...prev, { role: "assistant", text: data.reply }]);
    } catch (error) {
      setMessages((prev) => [...prev, { role: "assistant", text: `Error: ${error.message}` }]);
    } finally {
      setChatLoading(false);
    }
  };

  const startVoice = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setMessage("Voice input is not supported in this browser. Try Chrome.");
      return;
    }

    if (listening) {
      recognitionRef.current?.stop();
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onstart = () => setListening(true);
    recognition.onresult = (event) => {
      const spoken = event.results[0][0].transcript;
      setChatInput(spoken);
      sendChat(spoken);
    };
    recognition.onerror = () => {
      setListening(false);
      setMessage("Could not understand the voice. Please try again.");
    };
    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    recognition.start();
  };

  const cleanForSpeech = (text) =>
    text
      .replace(/```[\s\S]*?```/g, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/[#*_~`>|]/g, "")
      .replace(/^\s*[-*+]\s+/gm, "")
      .replace(/^\s*\d+\.\s+/gm, "")
      .replace(/\s+/g, " ")
      .trim();

  const speak = (text, index) => {
    if (!window.speechSynthesis) {
      setMessage("Speech output is not supported in this browser.");
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(cleanForSpeech(text));
    utterance.lang = "en-IN";
    utterance.rate = 0.95;
    utterance.onstart = () => setSpeakingIndex(index);
    utterance.onend = () => setSpeakingIndex(null);
    utterance.onerror = () => setSpeakingIndex(null);
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    window.speechSynthesis?.cancel();
    setSpeakingIndex(null);
  };

  const decisionAction = recovery?.recovery_decision?.action;
  const canRecover = [
    "ALTERNATIVE_PAYMENT_METHOD",
    "RETRY_PAYMENT",
    "SWITCH_GATEWAY",
    "RETRY_LATER",
  ].includes(decisionAction);

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <div className="brand">PAYRECOVER AI</div>
          <h1>Payment Recovery Agent</h1>
          <p>Detect failure → identify cause → choose recovery action</p>
        </div>
        <div className="online">● System Online</div>
      </header>

      <section className="stats-grid">
        <Stat title="Total Transactions" value={stats.total_transactions} />
        <Stat title="Failed Payments" value={stats.failed_payments} />
        <Stat title="Recovered Payments" value={stats.recovered_payments} />
        <Stat title="Recovery Rate" value={`${stats.recovery_rate}%`} />
      </section>

      <main className="content">
        <section className="panel analyzer">
          <div className="eyebrow">RECOVERY ENGINE</div>
          <h2>Recover a Failed Payment</h2>
          <p>Enter a failed transaction ID and get an immediate recovery decision.</p>

          <div className="transaction-row">
            <div className="field-wrap">
              <label htmlFor="transaction-id">Transaction ID</label>
              <input
                id="transaction-id"
                list="failed-transactions"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && analyzePayment()}
                placeholder="Example: TXN00000002"
              />
              <datalist id="failed-transactions">
                {transactionOptions.map((tx) => (
                  <option key={tx.transaction_id} value={tx.transaction_id} />
                ))}
              </datalist>
            </div>
            <button className="primary-button" onClick={analyzePayment} disabled={loading}>
              {loading ? "Analyzing..." : "Analyze Payment"}
            </button>
          </div>

          {message && <div className="notice">{message}</div>}
        </section>

        {recovery && (
          <section className="panel">
            <div className="result-heading">
              <div>
                <div className="eyebrow">AI DECISION</div>
                <h2>Recovery Result</h2>
              </div>
              <span className="status-pill">{recovery.recovery_result?.status}</span>
            </div>

            <div className="result-grid">
              <Info label="Transaction" value={recovery.transaction_id} />
              <Info label="Payment Status" value={recovery.status} />
              <Info label="Failure Reason" value={recovery.failure_reason || "None"} />
              <Info label="Amount" value={`₹${Number(recovery.amount || 0).toFixed(2)}`} />
              <Info label="Payment Method" value={recovery.payment_method} />
              <Info label="Gateway" value={recovery.gateway} />
              <Info label="AI Decision" value={recovery.recovery_decision?.action} />
              <Info label="Reason" value={recovery.recovery_decision?.reason} />
            </div>

            {canRecover && recovery.recovery_result?.status !== "RECOVERED" && (
              <div className="recovery-box">
                <div>
                  <strong>Ready for payment recovery</strong>
                  <p>Create a Razorpay test-mode recovery order for this failed transaction.</p>
                </div>
                <button className="dark-button" onClick={openRazorpayCheckout}>
                  Open Razorpay Checkout
                </button>
              </div>
            )}

            {recovery.payment_verification && (
              <div className="success-box">
                <strong>✓ Payment Verified</strong>
                <span>Payment ID: {recovery.payment_verification.payment_id}</span>
              </div>
            )}
          </section>
        )}

        {recovery?.audit_trail && (
          <section className="panel">
            <div className="eyebrow">TRACEABILITY</div>
            <h2>Recovery Audit Trail</h2>
            <div className="timeline">
              {recovery.audit_trail.map((item, index) => (
                <div className="timeline-item" key={`${item.step}-${index}`}>
                  <div className="timeline-number">{index + 1}</div>
                  <div>
                    <strong>{item.step}</strong>
                    <p>{typeof item.details === "object" ? JSON.stringify(item.details) : item.details}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="panel chatbot">
          <div className="eyebrow">AI ASSISTANT</div>
          <div className="chat-title-row">
            <div>
              <h2>Payment Recovery Chatbot</h2>
              <p>Ask general payment questions or ask about the selected transaction.</p>
            </div>
            <span className="chat-badge">Gemini AI</span>
          </div>

          <div className="chat-window">
            {messages.length === 0 ? (
              <div className="chat-welcome">
                <strong>Hi! I’m PayRecover AI.</strong>
                <p>Ask me about payment failures, recovery actions, Razorpay or your selected transaction.</p>
                <div className="suggestions">
                  <button onClick={() => sendChat("Why do payments fail?")}>Why do payments fail?</button>
                  <button onClick={() => sendChat("What recovery action should I take?")}>Recovery action?</button>
                  <button onClick={() => sendChat("Is this transaction recoverable?")}>Is this recoverable?</button>
                </div>
              </div>
            ) : (
              messages.map((item, index) => (
                <div key={index} className={`chat-message ${item.role}`}>
                  <div className="message-role">{item.role === "user" ? "You" : "AI"}</div>
                  <div className="message-text">{item.text}</div>
                  {item.role === "assistant" && (
                    <div className="voice-actions">
                      <button className="small-button" onClick={() => speak(item.text, index)}>
                        🔊 Speak
                      </button>
                      {speakingIndex === index && (
                        <button className="small-button" onClick={stopSpeaking}>⏹ Stop</button>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="chat-input-row">
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendChat()}
              placeholder="Ask in English or Hinglish..."
            />
            <button className={`voice-button ${listening ? "listening" : ""}`} onClick={startVoice}>
              {listening ? "🎙 Listening..." : "🎙"}
            </button>
            <button className="primary-button" onClick={() => sendChat()} disabled={chatLoading}>
              {chatLoading ? "..." : "Send"}
            </button>
          </div>
          <div className="voice-note">🎙 Voice input starts only when you press the microphone. 🔊 AI answers never speak automatically.</div>
        </section>
      </main>

      <footer>PayRecover AI • Detect → Diagnose → Decide → Recover → Verify</footer>
    </div>
  );
}

function Stat({ title, value }) {
  return (
    <div className="stat-card">
      <span>{title}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="info-item">
      <span>{label}</span>
      <strong>{value || "—"}</strong>
    </div>
  );
}

export default App;
