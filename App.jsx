import { useEffect, useRef, useState } from "react";
import "./App.css";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

function App() {
  // ============================================================
  // PAYMENT / DASHBOARD STATE
  // ============================================================

  const [transactionId, setTransactionId] = useState("TXN00000014");
  const [recovery, setRecovery] = useState(null);

  const [stats, setStats] = useState({
    total_transactions: 0,
    failed_payments: 0,
    recovered_payments: 0,
    recovery_rate: 0,
  });

  const [loading, setLoading] = useState(false);

  // ============================================================
  // CHAT STATE
  // ============================================================

  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);

  // ============================================================
  // VOICE STATE
  // ============================================================

  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  const recognitionRef = useRef(null);

  // ============================================================
  // LOAD RAZORPAY CHECKOUT SCRIPT
  // ============================================================

  useEffect(() => {
    if (window.Razorpay) {
      return;
    }

    const script = document.createElement("script");

    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;

    document.body.appendChild(script);

    return () => {
      // Do not remove the script because Razorpay may still be needed.
    };
  }, []);

  // ============================================================
  // LOAD DASHBOARD STATS
  // ============================================================

  const loadStats = async () => {
    try {
      const response = await fetch(`${API}/dashboard/stats`);

      if (!response.ok) {
        return;
      }

      const data = await response.json();

      setStats({
        total_transactions: data.total_transactions ?? 0,
        failed_payments: data.failed_payments ?? 0,
        recovered_payments: data.recovered_payments ?? 0,
        recovery_rate: data.recovery_rate ?? 0,
      });
    } catch (error) {
      console.log("Dashboard stats unavailable:", error.message);
    }
  };

  // ============================================================
  // AUTOMATICALLY REFRESH DASHBOARD
  // ============================================================

  useEffect(() => {
    loadStats();

    const timer = setInterval(() => {
      loadStats();
    }, 5000);

    return () => clearInterval(timer);
  }, []);

  // ============================================================
  // ANALYZE FAILED PAYMENT
  // ============================================================

  const recoverPayment = async () => {
    const txId = transactionId.trim();

    if (!txId) {
      alert("Please enter a transaction ID.");
      return;
    }

    setLoading(true);
    setRecovery(null);

    try {
      const response = await fetch(
        `${API}/recovery/execute/${encodeURIComponent(txId)}`,
        {
          method: "POST",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Recovery analysis failed."
        );
      }

      setRecovery(data);

      await loadStats();
    } catch (error) {
      console.error(error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // CREATE RAZORPAY ORDER
  // ============================================================

  const createRazorpayOrder = async () => {
    if (!recovery?.transaction_id) {
      alert("Analyze a failed transaction first.");
      return;
    }

    try {
      const response = await fetch(
        `${API}/recovery/create-order`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            transaction_id: recovery.transaction_id,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Could not create Razorpay order."
        );
      }

      if (!window.Razorpay) {
        throw new Error(
          "Razorpay Checkout is still loading. Please wait a few seconds and try again."
        );
      }

      const order = data.recovery_order;

      const options = {
        key: data.razorpay_key_id,
        amount: order.amount,
        currency: order.currency,
        name: "Payment Recovery AI",
        description: "Payment Recovery",
        order_id: order.id,

        handler: async function (paymentResponse) {
          await verifyPayment(
            paymentResponse,
            recovery.transaction_id
          );
        },

        prefill: {
          name: "Payment Recovery User",
          email: "demo@example.com",
          contact: "9999999999",
        },

        theme: {
          color: "#243b64",
        },

        modal: {
          ondismiss: function () {
            setRecovery((previous) => {
              if (!previous) {
                return previous;
              }

              return {
                ...previous,
                razorpay_message:
                  "Checkout was closed before payment.",
              };
            });
          },
        },
      };

      const checkout = new window.Razorpay(options);

      checkout.on("payment.failed", function (response) {
        console.log("Razorpay payment failed:", response);

        setRecovery((previous) => {
          if (!previous) {
            return previous;
          }

          return {
            ...previous,
            razorpay_message:
              response?.error?.description ||
              "Razorpay payment failed.",
          };
        });
      });

      checkout.open();
    } catch (error) {
      console.error(error);
      alert(error.message);
    }
  };

  // ============================================================
  // VERIFY RAZORPAY PAYMENT
  // ============================================================

  const verifyPayment = async (paymentResponse, txId) => {
    try {
      const response = await fetch(
        `${API}/recovery/verify-payment`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            transaction_id: txId,
            payment_id:
              paymentResponse.razorpay_payment_id,
            order_id:
              paymentResponse.razorpay_order_id,
            signature:
              paymentResponse.razorpay_signature,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Payment verification failed."
        );
      }

      setRecovery((previous) => ({
        ...previous,

        recovery_result: {
          ...(previous?.recovery_result || {}),
          action: "PAYMENT_RECOVERED",
          status: "RECOVERED",
        },

        payment_verification: data.payment,
      }));

      await loadStats();

      alert(
        "Payment verified successfully. Recovery status is now RECOVERED."
      );
    } catch (error) {
      console.error(error);
      alert(error.message);
    }
  };

  // ============================================================
  // SEND CHAT MESSAGE
  // ============================================================

  const sendChat = async (overrideMessage = null) => {
    const message = (
      overrideMessage !== null
        ? overrideMessage
        : chatInput
    ).trim();

    if (!message || chatLoading) {
      return;
    }

    setMessages((previous) => [
      ...previous,
      {
        role: "user",
        text: message,
      },
    ]);

    setChatInput("");
    setChatLoading(true);

    try {
      const response = await fetch(`${API}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,

          // Transaction ID is optional.
          // This allows normal chatbot conversations.
          transaction_id:
            transactionId.trim() || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Chatbot error."
        );
      }

      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          text: data.reply || "I could not generate a response.",
        },
      ]);
    } catch (error) {
      console.error(error);

      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          text: `Error: ${error.message}`,
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  // ============================================================
  // VOICE INPUT
  // ============================================================

  const startVoice = () => {
    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert(
        "Voice input is not supported in this browser. Please use Google Chrome."
      );
      return;
    }

    if (listening) {
      return;
    }

    const recognition = new SpeechRecognition();

    recognition.lang = "en-IN";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setListening(true);
    };

    recognition.onresult = (event) => {
      const spokenText =
        event.results?.[0]?.[0]?.transcript || "";

      if (spokenText.trim()) {
        setChatInput(spokenText);

        // Voice question is sent automatically.
        // AI answer is NOT spoken automatically.
        sendChat(spokenText);
      }
    };

    recognition.onerror = (event) => {
      console.error("Voice recognition error:", event.error);

      setListening(false);

      if (event.error !== "no-speech") {
        alert(
          "Could not understand the voice. Please try again."
        );
      }
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (error) {
      console.error(error);
      setListening(false);
    }
  };

  // ============================================================
  // CLEAN TEXT FOR SPEECH
  // ============================================================

  const cleanTextForSpeech = (text) => {
    if (!text) {
      return "";
    }

    let cleaned = String(text);

    // Remove code blocks
    cleaned = cleaned.replace(/```[\s\S]*?```/g, "");

    // Remove inline code
    cleaned = cleaned.replace(/`([^`]+)`/g, "$1");

    // Remove markdown headings
    cleaned = cleaned.replace(
      /^\s*#{1,6}\s*/gm,
      ""
    );

    // Remove bold / italic
    cleaned = cleaned.replace(/\*\*(.*?)\*\*/g, "$1");
    cleaned = cleaned.replace(/\*(.*?)\*/g, "$1");
    cleaned = cleaned.replace(/__(.*?)__/g, "$1");
    cleaned = cleaned.replace(/_(.*?)_/g, "$1");

    // Remove bullet symbols
    cleaned = cleaned.replace(
      /^\s*[-*+]\s+/gm,
      ""
    );

    // Remove numbered list formatting
    cleaned = cleaned.replace(
      /^\s*\d+\.\s+/gm,
      ""
    );

    // Convert markdown links to text
    cleaned = cleaned.replace(
      /\[([^\]]+)\]\([^)]+\)/g,
      "$1"
    );

    // Remove remaining markdown characters
    cleaned = cleaned.replace(
      /[#*_~`>|]/g,
      ""
    );

    // Remove excessive spaces
    cleaned = cleaned.replace(/\s+/g, " ");

    return cleaned.trim();
  };

  // ============================================================
  // SPEAK AI RESPONSE
  // ============================================================

  const speak = (text) => {
    if (!window.speechSynthesis) {
      alert(
        "Speech output is not supported in this browser."
      );
      return;
    }

    const cleanedText =
      cleanTextForSpeech(text);

    if (!cleanedText) {
      return;
    }

    window.speechSynthesis.cancel();

    const utterance =
      new SpeechSynthesisUtterance(cleanedText);

    utterance.lang = "en-IN";
    utterance.rate = 0.95;
    utterance.pitch = 1;

    utterance.onstart = () => {
      setSpeaking(true);
    };

    utterance.onend = () => {
      setSpeaking(false);
    };

    utterance.onerror = () => {
      setSpeaking(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  // ============================================================
  // STOP SPEAKING
  // ============================================================

  const stopSpeaking = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    setSpeaking(false);
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="app">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <header className="header">

        <div>
          <div className="brand">
            PAYMENT RECOVERY AI
          </div>

          <h1>
            Payment Recovery Agent
          </h1>

          <p>
            AI-powered payment failure detection
            and recovery
          </p>
        </div>

        <div className="status">
          <span>●</span> System Online
        </div>

      </header>


      {/* ======================================================
          DASHBOARD STATISTICS
      ====================================================== */}

      <section className="stats">

        <Stat
          title="Total Transactions"
          value={stats.total_transactions}
        />

        <Stat
          title="Failed Payments"
          value={stats.failed_payments}
        />

        <Stat
          title="Recovered Payments"
          value={stats.recovered_payments}
        />

        <Stat
          title="Recovery Rate"
          value={`${stats.recovery_rate}%`}
        />

      </section>


      <main className="main">

        {/* ====================================================
            RECOVERY ENGINE
        ==================================================== */}

        <section className="panel hero-panel">

          <div className="section-tag">
            RECOVERY ENGINE
          </div>

          <h2>
            Recover a Failed Payment
          </h2>

          <p>
            Enter a failed transaction ID and let
            the recovery agent analyze the failure
            and recommend the best recovery action.
          </p>

          <div className="input-row">

            <input
              type="text"
              value={transactionId}
              placeholder="Example: TXN00000014"
              onChange={(event) =>
                setTransactionId(event.target.value)
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  recoverPayment();
                }
              }}
            />

            <button
              onClick={recoverPayment}
              disabled={loading}
            >
              {loading
                ? "Analyzing..."
                : "Analyze Payment"}
            </button>

          </div>

        </section>


        {/* ====================================================
            RECOVERY RESULT
        ==================================================== */}

        {recovery && (
          <>
            <section className="panel result">

              <div className="section-heading">

                <div>

                  <div className="section-tag">
                    AI DECISION
                  </div>

                  <h2>
                    Recovery Result
                  </h2>

                </div>

                <span className="pill">
                  {recovery.recovery_result?.status ||
                    "ANALYZED"}
                </span>

              </div>


              <div className="result-grid">

                <Info
                  label="Transaction"
                  value={recovery.transaction_id}
                />

                <Info
                  label="Payment Status"
                  value={recovery.payment_status}
                />

                <Info
                  label="Failure Reason"
                  value={
                    recovery.failure_reason ||
                    "None"
                  }
                />

                <Info
                  label="Amount"
                  value={`₹${Number(
                    recovery.amount || 0
                  ).toFixed(2)}`}
                />

                <Info
                  label="Payment Method"
                  value={recovery.payment_method}
                />

                <Info
                  label="Gateway"
                  value={recovery.gateway}
                />

                <Info
                  label="AI Decision"
                  value={
                    recovery.recovery_decision?.action
                  }
                />

                <Info
                  label="Reason"
                  value={
                    recovery.recovery_decision?.reason
                  }
                />

              </div>


              {/* ==================================================
                  RECOVERY ACTION
              ================================================== */}

              {[
                "ALTERNATIVE_PAYMENT_METHOD",
                "RETRY_PAYMENT",
                "SWITCH_GATEWAY",
                "RETRY_LATER",
              ].includes(
                recovery.recovery_decision?.action
              ) &&
                recovery.recovery_result?.status !==
                  "RECOVERED" && (

                  <div className="recovery-action-box">

                    <div>

                      <strong>
                        Ready for payment recovery
                      </strong>

                      <p>
                        Create a Razorpay test-mode
                        recovery order for this
                        failed transaction.
                      </p>

                    </div>

                    <button
                      onClick={createRazorpayOrder}
                    >
                      💳 Open Razorpay Checkout
                    </button>

                  </div>
                )}


              {/* ==================================================
                  RAZORPAY MESSAGE
              ================================================== */}

              {recovery.razorpay_message && (
                <div className="warning-box">

                  <strong>
                    Razorpay Status
                  </strong>

                  <p>
                    {recovery.razorpay_message}
                  </p>

                </div>
              )}


              {/* ==================================================
                  PAYMENT VERIFIED
              ================================================== */}

              {recovery.payment_verification && (

                <div className="success-box">

                  <strong>
                    ✓ Payment Verified
                  </strong>

                  <span>
                    Payment ID:{" "}
                    {
                      recovery.payment_verification
                        .payment_id
                    }
                  </span>

                </div>

              )}

            </section>


            {/* ==================================================
                AUDIT TRAIL
            ================================================== */}

            {recovery.audit_trail &&
              recovery.audit_trail.length > 0 && (

                <section className="panel">

                  <div className="section-tag">
                    TRACEABILITY
                  </div>

                  <h2>
                    Recovery Audit Trail
                  </h2>

                  <div className="timeline">

                    {recovery.audit_trail.map(
                      (item, index) => (

                        <div
                          className="timeline-item"
                          key={index}
                        >

                          <div className="dot"></div>

                          <div>

                            <strong>
                              {item.step}
                            </strong>

                            <p>
                              {typeof item.details ===
                              "object"
                                ? JSON.stringify(
                                    item.details
                                  )
                                : item.details}
                            </p>

                          </div>

                        </div>

                      )
                    )}

                  </div>

                </section>
              )}

          </>
        )}


        {/* ====================================================
            AI CHATBOT
        ==================================================== */}

        <section className="panel chatbot">

          <div className="section-tag">
            GENERATIVE AI
          </div>

          <h2>
            🤖 AI Recovery Assistant
          </h2>

          <p>
            Ask questions about payment failures,
            recovery, Razorpay, or a specific
            transaction. You can also ask in
            Hinglish.
          </p>


          {/* ==================================================
              CHAT WINDOW
          ================================================== */}

          <div className="chat-window">

            {messages.length === 0 ? (

              <div className="empty-chat">

                <p>
                  👋 Hello! I am your Payment
                  Recovery Assistant.
                </p>

                <p>
                  You can ask me anything related
                  to payment recovery.
                </p>

                <div className="suggestions">

                  <button
                    onClick={() =>
                      sendChat(
                        "What is payment recovery?"
                      )
                    }
                  >
                    What is payment recovery?
                  </button>

                  <button
                    onClick={() =>
                      sendChat(
                        "Why do payments fail?"
                      )
                    }
                  >
                    Why do payments fail?
                  </button>

                  <button
                    onClick={() =>
                      sendChat(
                        "Payment fail kyu hota hai?"
                      )
                    }
                  >
                    Payment fail kyu hota hai?
                  </button>

                  <button
                    onClick={() =>
                      sendChat(
                        "What can I do if my payment fails?"
                      )
                    }
                  >
                    What can I do if my payment fails?
                  </button>

                </div>

              </div>

            ) : (

              messages.map((message, index) => (

                <div
                  className={`chat-message ${message.role}`}
                  key={index}
                >

                  <span>
                    {message.role === "user"
                      ? "You"
                      : "AI"}
                  </span>

                  <p>
                    {message.text}
                  </p>


                  {/* ============================================
                      SPEAK BUTTON
                      AI DOES NOT AUTO-SPEAK
                  ============================================ */}

                  {message.role === "assistant" && (

                    <div className="voice-controls">

                      <button
                        className="small-button"
                        onClick={() =>
                          speak(message.text)
                        }
                      >
                        🔊 Speak
                      </button>

                      {speaking && (
                        <button
                          className="small-button"
                          onClick={stopSpeaking}
                        >
                          ⏹ Stop
                        </button>
                      )}

                    </div>

                  )}

                </div>

              ))

            )}

            {chatLoading && (
              <div className="typing">
                AI is thinking...
              </div>
            )}

          </div>


          {/* ==================================================
              CHAT INPUT
          ================================================== */}

          <div className="chat-input-row">

            <input
              value={chatInput}
              onChange={(event) =>
                setChatInput(event.target.value)
              }
              placeholder="Ask in English or Hinglish..."
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  sendChat();
                }
              }}
            />


            {/* VOICE INPUT */}

            <button
              className={
                listening ? "listening" : ""
              }
              onClick={startVoice}
              title="Ask using your voice"
            >
              {listening
                ? "🎙️ Listening..."
                : "🎙️"}
            </button>


            {/* SEND */}

            <button
              onClick={() => sendChat()}
              disabled={chatLoading}
            >
              {chatLoading ? "..." : "Send"}
            </button>

          </div>


          <div className="voice-note">
            🎙️ Click the microphone to ask a
            question by voice.
            <br />
            🔊 Click <b>Speak</b> if you want the
            AI answer read aloud.
          </div>

        </section>


        {/* ====================================================
            SYSTEM ARCHITECTURE
        ==================================================== */}

        <section className="panel architecture">

          <div className="section-tag">
            PROJECT ARCHITECTURE
          </div>

          <h2>
            How the Payment Recovery Agent Works
          </h2>

          <div className="module-grid">

            <Module
              title="1. Payment Data"
              text="The system receives transaction details and payment failure information."
            />

            <Module
              title="2. Recovery Agent"
              text="The agent analyzes the payment failure and selects an appropriate recovery action."
            />

            <Module
              title="3. Recovery Action"
              text="The system can recommend retrying, switching gateway, using an alternative method, or retrying later."
            />

            <Module
              title="4. Razorpay"
              text="Razorpay test mode is used to create and verify the recovery payment."
            />

            <Module
              title="5. Gemini AI"
              text="Gemini provides natural-language explanations and answers user questions about payment recovery."
            />

            <Module
              title="6. Voice Assistant"
              text="Users can ask questions using voice and can optionally hear the AI response."
            />

            <Module
              title="7. Audit Trail"
              text="Each recovery decision is recorded so the process remains traceable."
            />

            <Module
              title="8. Dashboard"
              text="Live statistics show transactions, failed payments, recovered payments and recovery rate."
            />

          </div>

        </section>

      </main>


      {/* ======================================================
          FOOTER
      ====================================================== */}

      <footer>
        Payment Recovery AI •
        AI-powered payment failure detection
        and recovery
      </footer>

    </div>
  );
}


// ============================================================
// STAT COMPONENT
// ============================================================

function Stat({ title, value }) {
  return (
    <div className="card">

      <h3>
        {title}
      </h3>

      <h2>
        {value}
      </h2>

    </div>
  );
}


// ============================================================
// INFO COMPONENT
// ============================================================

function Info({ label, value }) {
  return (
    <div className="info-card">

      <span>
        {label}
      </span>

      <strong>
        {value || "—"}
      </strong>

    </div>
  );
}


// ============================================================
// MODULE COMPONENT
// ============================================================

function Module({ title, text }) {
  return (
    <div className="module-card">

      <h3>
        {title}
      </h3>

      <p>
        {text}
      </p>

    </div>
  );
}


export default App;