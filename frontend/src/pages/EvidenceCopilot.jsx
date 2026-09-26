import React, { useEffect, useMemo, useState } from "react";
import {
  Bot,
  ChevronRight,
  FileSearch,
  LoaderCircle,
  Send,
  ShieldCheck,
  Sparkles,
  User,
  X,
} from "lucide-react";

function buildAnswer(question, evidence, recoverySummary) {
  const q = question.toLowerCase();

  if (
    q.includes("confidence") ||
    q.includes("why") ||
    q.includes("recovery confidence")
  ) {
    return {
      title: "Recovery confidence analysis",
      text: `${evidence.name} currently has a recovery confidence of ${evidence.confidence}%. The evidence is classified as "${evidence.status}". The backend reports ${evidence.fragments} fragments for this evidence item, with an integrity result of ${evidence.integrity}.`,
      points: [
        `Evidence ID: ${evidence.id}`,
        `File type: ${evidence.type}`,
        `Recovery status: ${evidence.status}`,
        `Recovery confidence: ${evidence.confidence}%`,
        `Integrity: ${evidence.integrity}`,
        `Fragments detected: ${evidence.fragments}`,
      ],
    };
  }

  if (
    q.includes("fragment") ||
    q.includes("pieces") ||
    q.includes("parts")
  ) {
    return {
      title: "Fragment analysis",
      text: `${evidence.name} is currently associated with ${evidence.fragments} detected fragments from the backend analysis. Fragment relationships should be interpreted using offsets, signatures, structural compatibility and other observed evidence rather than treating a similarity score as proof of origin.`,
      points: [
        `Evidence: ${evidence.name}`,
        `Fragments: ${evidence.fragments}`,
        `Type: ${evidence.type}`,
        "Relationship status: Backend-derived analysis",
      ],
    };
  }

  if (
    q.includes("missing") ||
    q.includes("incomplete") ||
    q.includes("completeness")
  ) {
    return {
      title: "Missing and incomplete data",
      text: `The current backend recovery summary reports ${recoverySummary.completeness}% completeness. Missing or reconstructed regions must remain clearly distinguished from verified original bytes.`,
      points: [
        `Completeness: ${recoverySummary.completeness}%`,
        `Structural confidence: ${recoverySummary.structural}%`,
        `Recovery confidence: ${recoverySummary.confidence}%`,
        "Unverified regions must not be treated as verified original data.",
      ],
    };
  }

  if (
    q.includes("integrity") ||
    q.includes("structural") ||
    q.includes("valid")
  ) {
    return {
      title: "Integrity assessment",
      text: `${evidence.name} has an integrity result of ${evidence.integrity}. Structural validation does not by itself prove byte-for-byte equivalence with the original evidence.`,
      points: [
        `Evidence: ${evidence.id}`,
        `Integrity: ${evidence.integrity}`,
        `Recovery classification: ${evidence.status}`,
        "Byte-level equivalence requires comparison with known ground truth.",
      ],
    };
  }

  if (
    q.includes("priority") ||
    q.includes("important") ||
    q.includes("investigate")
  ) {
    return {
      title: "Evidence priority",
      text: `${evidence.name} is currently marked ${evidence.priority} priority based on recovery-related characteristics. This is not a statement about legal importance.`,
      points: [
        `Current priority: ${evidence.priority}`,
        `Recovery confidence: ${evidence.confidence}%`,
        `Integrity: ${evidence.integrity}`,
        `Recovery status: ${evidence.status}`,
      ],
    };
  }

  if (
    q.includes("explain") ||
    q.includes("details") ||
    q.includes("about")
  ) {
    return {
      title: `Evidence details — ${evidence.name}`,
      text: `${evidence.name} is a ${evidence.type} evidence item identified as ${evidence.id}. The backend currently classifies it as "${evidence.status}" with ${evidence.confidence}% recovery confidence.`,
      points: [
        `Filename: ${evidence.name}`,
        `Evidence ID: ${evidence.id}`,
        `Type: ${evidence.type}`,
        `Fragments: ${evidence.fragments}`,
        `Recovery: ${evidence.status}`,
        `Integrity: ${evidence.integrity}`,
        `Confidence: ${evidence.confidence}%`,
        `Priority: ${evidence.priority}`,
      ],
    };
  }

  return {
    title: "Evidence-grounded response",
    text: `I can analyze ${evidence.name} using the recovery metadata currently available from the backend. There is insufficient evidence for a more specific forensic conclusion.`,
    points: [
      `Selected file: ${evidence.name}`,
      `Evidence ID: ${evidence.id}`,
      `Type: ${evidence.type}`,
      `Status: ${evidence.status}`,
      "INSUFFICIENT EVIDENCE for unsupported conclusions",
    ],
  };
}

function initialMessage(evidence) {
  return {
    role: "assistant",
    title: "Evidence Copilot ready",
    text: `I am currently analyzing ${evidence.name}. Ask me about recovery confidence, fragments, integrity, missing data, provenance, or evidence priority.`,
    points: [
      `Selected evidence: ${evidence.id}`,
      `Recovery: ${evidence.status}`,
      `Confidence: ${evidence.confidence}%`,
    ],
  };
}

export default function EvidenceCopilot({
  evidence,
  recoverySummary,
  onClose,
}) {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState(() => [
    initialMessage(evidence),
  ]);
  const [loading, setLoading] = useState(false);

  /*
   * IMPORTANT:
   * RecoveredEvidence first renders while the backend request is loading.
   * At that moment confidence can be 0. When the real backend response
   * arrives, the evidence prop changes to 99%, but the old Copilot message
   * would otherwise remain at 0%.
   *
   * Reset the context whenever the actual evidence record changes.
   */
  useEffect(() => {
    setMessages([initialMessage(evidence)]);
    setQuestion("");
    setLoading(false);
  }, [
    evidence.id,
    evidence.name,
    evidence.type,
    evidence.status,
    evidence.confidence,
    evidence.integrity,
    evidence.fragments,
    evidence.priority,
  ]);

  const suggestions = useMemo(
    () => [
      `Why is ${evidence.name} ${evidence.confidence}% confidence?`,
      `Explain the fragments of ${evidence.name}`,
      "What data is missing?",
      "Explain the integrity result",
    ],
    [
      evidence.name,
      evidence.confidence,
    ]
  );

  const askQuestion = async (value = question) => {
    const trimmed = value.trim();

    if (!trimmed || loading) return;

    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        text: trimmed,
      },
    ]);

    setQuestion("");
    setLoading(true);

    await new Promise((resolve) =>
      setTimeout(resolve, 500)
    );

    const answer = buildAnswer(
      trimmed,
      evidence,
      recoverySummary
    );

    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        ...answer,
      },
    ]);

    setLoading(false);
  };

  return (
    <aside className="evidence-copilot">
      <div className="copilot-header">
        <div className="copilot-title">
          <div className="copilot-icon">
            <Bot size={19} />
          </div>

          <div>
            <strong>Evidence Copilot</strong>
            <span>
              <i />
              Grounded in current evidence
            </span>
          </div>
        </div>

        {onClose && (
          <button
            className="copilot-close"
            onClick={onClose}
            type="button"
            aria-label="Close Evidence Copilot"
          >
            <X size={17} />
          </button>
        )}
      </div>

      <div className="copilot-context">
        <div className="context-file">
          <FileSearch size={16} />

          <div>
            <strong>{evidence.name}</strong>
            <span>
              {evidence.id} · {evidence.type}
            </span>
          </div>
        </div>

        <div className="context-confidence">
          <span>CONFIDENCE</span>
          <strong>{evidence.confidence}%</strong>
        </div>
      </div>

      <div className="copilot-messages">
        {messages.map((message, index) => (
          <div
            className={`copilot-message ${message.role}`}
            key={`${message.role}-${index}`}
          >
            <div className="message-avatar">
              {message.role === "assistant" ? (
                <Bot size={14} />
              ) : (
                <User size={14} />
              )}
            </div>

            <div className="message-body">
              {message.title && (
                <strong className="message-title">
                  {message.title}
                </strong>
              )}

              <p>{message.text}</p>

              {message.points?.length > 0 && (
                <div className="evidence-support">
                  <div className="support-heading">
                    <ShieldCheck size={13} />
                    Supporting evidence
                  </div>

                  {message.points.map(
                    (point, pointIndex) => (
                      <div
                        className="support-item"
                        key={pointIndex}
                      >
                        <ChevronRight size={12} />
                        <span>{point}</span>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="copilot-message assistant">
            <div className="message-avatar">
              <Bot size={14} />
            </div>

            <div className="message-body">
              <div className="copilot-thinking">
                <LoaderCircle
                  size={14}
                  className="spin"
                />
                Analyzing evidence...
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="copilot-suggestions">
        <div className="suggestion-heading">
          <Sparkles size={13} />
          Suggested questions
        </div>

        {suggestions.map((suggestion) => (
          <button
            key={suggestion}
            onClick={() =>
              askQuestion(suggestion)
            }
            disabled={loading}
            type="button"
          >
            {suggestion}
          </button>
        ))}
      </div>

      <div className="copilot-input-area">
        <div className="copilot-input">
          <input
            value={question}
            onChange={(e) =>
              setQuestion(e.target.value)
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                askQuestion();
              }
            }}
            placeholder="Ask about this evidence..."
            disabled={loading}
          />

          <button
            onClick={() => askQuestion()}
            disabled={
              !question.trim() || loading
            }
            title="Ask Evidence Copilot"
            type="button"
          >
            <Send size={16} />
          </button>
        </div>

        <small>
          AI responses are grounded in available
          evidence. Unsupported conclusions are marked
          as insufficient evidence.
        </small>
      </div>
    </aside>
  );
}
