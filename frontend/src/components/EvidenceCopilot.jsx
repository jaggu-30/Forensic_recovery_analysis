import React, { useMemo, useState } from "react";
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
      text: `${evidence.name} currently has a recovery confidence of ${evidence.confidence}%. The evidence is classified as "${evidence.status}". The available demo data records ${evidence.fragments} fragments for this evidence item, with an integrity value of ${evidence.integrity}.`,
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
      text: `${evidence.name} is currently associated with ${evidence.fragments} detected fragments in the demonstration dataset. Fragment relationships are evaluated using structural characteristics, offsets, file signatures and compatibility rather than treating a semantic similarity score as proof of origin.`,
      points: [
        `Evidence: ${evidence.name}`,
        `Fragments: ${evidence.fragments}`,
        `Type: ${evidence.type}`,
        "Relationship status: Candidate relationships identified",
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
      text: `The current recovery summary reports ${recoverySummary.completeness}% completeness. This means the recovered representation does not contain all of the original data according to the demonstration metrics. Missing or reconstructed regions should not automatically be treated as verified original data.`,
      points: [
        `Completeness: ${recoverySummary.completeness}%`,
        `Structural integrity: ${recoverySummary.structural}%`,
        `Recovery confidence: ${recoverySummary.confidence}%`,
        "Unverified regions must remain clearly identified.",
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
      text: `${evidence.name} has an integrity value of ${evidence.integrity}. The integrity value describes the structural validation represented by the current demo dataset. It should not be interpreted as proof that every byte is identical to the original evidence.`,
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
      text: `${evidence.name} is currently marked ${evidence.priority} priority in the demonstration dataset. This priority is based on recovery-related characteristics and is not a statement about legal importance.`,
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
      text: `${evidence.name} is a ${evidence.type} evidence item identified as ${evidence.id}. The current demonstration dataset classifies it as "${evidence.status}" with ${evidence.confidence}% recovery confidence and ${evidence.integrity} integrity.`,
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

  if (
    q.includes("highest") ||
    q.includes("best recovered") ||
    q.includes("strongest")
  ) {
    return {
      title: "Current evidence context",
      text: `The copilot is currently focused on ${evidence.name}. To compare all recovered files, the evidence table and recovery metrics should be evaluated together rather than using confidence alone as proof of originality.`,
      points: [
        `Selected evidence: ${evidence.name}`,
        `Confidence: ${evidence.confidence}%`,
        `Integrity: ${evidence.integrity}`,
        `Status: ${evidence.status}`,
      ],
    };
  }

  return {
    title: "Evidence-grounded response",
    text: `I can analyze the currently selected evidence item, ${evidence.name}, using the available recovery metadata. I do not have sufficient evidence in the current demo dataset to make a more specific forensic conclusion about that question.`,
    points: [
      `Selected file: ${evidence.name}`,
      `Evidence ID: ${evidence.id}`,
      `Type: ${evidence.type}`,
      `Status: ${evidence.status}`,
      "INSUFFICIENT EVIDENCE for unsupported conclusions",
    ],
  };
}

export default function EvidenceCopilot({
  evidence,
  recoverySummary,
  onClose,
}) {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      title: "Evidence Copilot ready",
      text: `I am currently analyzing ${evidence.name}. Ask me about recovery confidence, fragments, integrity, missing data, provenance, or evidence priority.`,
      points: [
        `Selected evidence: ${evidence.id}`,
        `Recovery: ${evidence.status}`,
        `Confidence: ${evidence.confidence}%`,
      ],
    },
  ]);
  const [loading, setLoading] = useState(false);

  const suggestions = useMemo(
    () => [
      `Why is ${evidence.name} ${evidence.confidence}% confidence?`,
      `Explain the fragments of ${evidence.name}`,
      `What data is missing?`,
      `Explain the integrity result`,
    ],
    [evidence]
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

    await new Promise((resolve) => setTimeout(resolve, 650));

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
          <button className="copilot-close" onClick={onClose}>
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

                  {message.points.map((point, pointIndex) => (
                    <div className="support-item" key={pointIndex}>
                      <ChevronRight size={12} />
                      <span>{point}</span>
                    </div>
                  ))}
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
                <LoaderCircle size={14} className="spin" />
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
            onClick={() => askQuestion(suggestion)}
            disabled={loading}
          >
            {suggestion}
          </button>
        ))}
      </div>

      <div className="copilot-input-area">
        <div className="copilot-input">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
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
            disabled={!question.trim() || loading}
            title="Ask Evidence Copilot"
          >
            <Send size={16} />
          </button>
        </div>

        <small>
          AI responses are grounded in available evidence. Unsupported
          conclusions are marked as insufficient evidence.
        </small>
      </div>
    </aside>
  );
}