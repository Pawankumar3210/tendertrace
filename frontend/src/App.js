import React, { useState, useEffect } from "react";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./App.css";

const API = "https://pawan0123-tendertrace-backend.hf.space";

// ── BOOT SCREEN ──
function BootScreen({ onDone }) {
  const [lines, setLines] = useState([]);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const bootLines = [
      "INITIALIZING TENDERTRACE AI...",
      "Loading Government Procurement Module...",
      "Connecting to Google Gemini 1.5 Pro...",
      "Document OCR Engine: READY",
      "Eligibility Evaluation Engine: ONLINE",
      "Audit Trail System: ACTIVE",
      "Encryption Layer: VERIFIED",
      "All systems operational. Welcome.",
    ];
    let i = 0;
    let done = false;
    const interval = setInterval(() => {
      if (done) return;
      if (i < bootLines.length) {
        const line = bootLines[i];
        setLines(prev => prev[prev.length - 1] === line ? prev : [...prev, line]);
        setProgress(Math.round(((i + 1) / bootLines.length) * 100));
        i++;
      } else {
        done = true;
        clearInterval(interval);
        setTimeout(onDone, 600);
      }
    }, 400);
    return () => { done = true; clearInterval(interval); };
  }, []); // eslint-disable-line

  return (
    <div className="boot">
      <div className="boot-emblem">
        <div className="boot-emblem-ring boot-emblem-ring-1"></div>
        <div className="boot-emblem-ring boot-emblem-ring-2"></div>
        <div className="boot-emblem-ring boot-emblem-ring-3"></div>
        <div className="boot-emblem-core"><span className="boot-emblem-t">T</span></div>
      </div>
      <div className="boot-brand">TenderTrace AI</div>
      <div className="boot-subbrand">GOVERNMENT PROCUREMENT INTELLIGENCE SYSTEM</div>
      <div className="boot-divider"></div>
      <div className="boot-log">
        {lines.map((l, i) => (
          <div key={i} className="boot-line">
            <span className="boot-arrow">›</span>
            <span className="boot-line-text">{l}</span>
          </div>
        ))}
        {lines.length < 8 && <span className="boot-cursor">█</span>}
      </div>
      <div className="boot-progress-wrap">
        <div className="boot-progress-track">
          <div className="boot-progress-fill" style={{ width: `${progress}%` }}></div>
        </div>
        <span className="boot-pct">{progress}%</span>
      </div>
      <div className="boot-footer">SECURE · EXPLAINABLE · AUDIT-READY</div>
    </div>
  );
}

function ConfidenceBadge({ score }) {
  const cls = score >= 85 ? "conf-high" : score >= 60 ? "conf-med" : "conf-low";
  return <span className={`conf-badge ${cls}`}>{score}%</span>;
}

function StatusBadge({ status }) {
  const map = {
    "Eligible": "badge-pass", "Pass": "badge-pass",
    "Not Eligible": "badge-fail", "Fail": "badge-fail",
    "Needs Review": "badge-review",
  };
  return <span className={`status-badge ${map[status] || "badge-review"}`}>{status}</span>;
}

function CriterionRow({ cr }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className={`cr-row ${cr.status === "Needs Review" ? "cr-row--amber" : cr.status === "Fail" ? "cr-row--red" : ""}`}>
      <div className="cr-row-top" onClick={() => setExpanded(!expanded)}>
        <StatusBadge status={cr.status} />
        <span className="cr-name">{cr.criterion_name}</span>
        <span className="cr-doc">{cr.source_document}</span>
        <ConfidenceBadge score={cr.confidence} />
        <span className="cr-chevron">{expanded ? "▲" : "▼"}</span>
      </div>
      {expanded && (
        <div className="cr-expanded">
          <div className="cr-detail-grid">
            <div className="cr-detail">
              <span className="cr-detail-label">Found Value</span>
              <span className="cr-detail-val">{cr.found_value}</span>
            </div>
            <div className="cr-detail">
              <span className="cr-detail-label">Source Document</span>
              <span className="cr-detail-val">{cr.source_document}</span>
            </div>
            <div className="cr-detail">
              <span className="cr-detail-label">Confidence Score</span>
              <span className="cr-detail-val">{cr.confidence}% — {cr.confidence >= 85 ? "High confidence" : cr.confidence >= 60 ? "Medium confidence" : "Low confidence — manual review advised"}</span>
            </div>
            <div className="cr-detail">
              <span className="cr-detail-label">Criterion ID</span>
              <span className="cr-detail-val">{cr.criterion_id}</span>
            </div>
          </div>
          <div className="cr-explanation-wrap">
            <span className="cr-detail-label">AI Explanation</span>
            <p className="cr-explanation">{cr.explanation}</p>
          </div>
          {cr.status === "Needs Review" && (
            <div className="cr-human-review">
              ⚠ HUMAN REVIEW REQUIRED — This criterion result is ambiguous. A procurement officer must manually verify before making a final decision.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function BidderCard({ evaluation, isSelected, onClick }) {
  const statusClass = evaluation.overall_status === "Eligible" ? "bidder-pass" :
    evaluation.overall_status === "Not Eligible" ? "bidder-fail" : "bidder-review";
  const passed = evaluation.criteria_results.filter(c => c.status === "Pass").length;
  const total = evaluation.criteria_results.length;
  return (
    <div className={`bidder-card ${statusClass} ${isSelected ? "bidder-card--selected" : ""}`} onClick={onClick}>
      <div className="bidder-card-top">
        <div className="bidder-avatar">{evaluation.bidder_name.charAt(0)}</div>
        <div className="bidder-info">
          <p className="bidder-name">{evaluation.bidder_name}</p>
          <StatusBadge status={evaluation.overall_status} />
        </div>
        <ConfidenceBadge score={evaluation.overall_confidence} />
      </div>
      <div className="bidder-progress-row">
        <div className="bidder-progress-track">
          <div className="bidder-progress-fill" style={{ width: `${(passed / total) * 100}%` }}></div>
        </div>
        <span className="bidder-progress-label">{passed}/{total}</span>
      </div>
      <div className="bidder-mini-criteria">
        {evaluation.criteria_results.map(cr => (
          <div key={cr.criterion_id}
            className={`mini-dot ${cr.status === "Pass" ? "mini-dot--pass" : cr.status === "Fail" ? "mini-dot--fail" : "mini-dot--review"}`}
            title={`${cr.criterion_name}: ${cr.status}`}>
          </div>
        ))}
      </div>
    </div>
  );
}

function ComparisonTable({ evaluations }) {
  if (!evaluations.length) return null;
  const criteria = evaluations[0].criteria_results.map(cr => cr.criterion_name);
  return (
    <div className="comparison-wrap">
      <div className="section-title">Side-by-Side Comparison Matrix</div>
      <div className="comparison-table-wrap">
        <table className="comparison-table">
          <thead>
            <tr>
              <th>Criterion</th>
              {evaluations.map(e => <th key={e.bidder_name}>{e.bidder_name}</th>)}
            </tr>
          </thead>
          <tbody>
            {criteria.map((crit, i) => (
              <tr key={i}>
                <td className="crit-col">{crit}</td>
                {evaluations.map(e => {
                  const cr = e.criteria_results[i];
                  return (
                    <td key={e.bidder_name} className="status-col">
                      <StatusBadge status={cr.status} />
                      <div className="comp-conf"><ConfidenceBadge score={cr.confidence} /></div>
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr className="overall-row">
              <td className="crit-col"><strong>Overall Verdict</strong></td>
              {evaluations.map(e => (
                <td key={e.bidder_name} className="status-col">
                  <StatusBadge status={e.overall_status} />
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AuditTrail({ entries }) {
  return (
    <div className="audit-panel">
      <div className="section-title">Complete Audit Trail</div>
      {entries.length === 0 && <p className="empty-msg">No audit entries yet — start by loading a tender</p>}
      {entries.map((e, i) => (
        <div key={i} className={`audit-entry audit-${e.type}`}>
          <span className="audit-time">{e.time}</span>
          <span className="audit-icon">{e.type === "success" ? "✓" : e.type === "warning" ? "⚠" : e.type === "error" ? "✕" : "·"}</span>
          <span className="audit-msg">{e.msg}</span>
        </div>
      ))}
    </div>
  );
}

// ── UPLOAD WIZARD ──

function UploadWizard({ onComplete, onDemo, loading, addAudit }) {
  const [step, setStep] = useState(1);
  const [tenderFile, setTenderFile] = useState(null);
  const [tenderData, setTenderData] = useState(null);
  const [bidders, setBidders] = useState([{ id: 1, name: "", file: null }]);
  const [analyzing, setAnalyzing] = useState(false);
  const [currentBidderIdx, setCurrentBidderIdx] = useState(-1);

  const uploadTenderFile = async () => {
    if (!tenderFile) return toast.warning("Please select a tender PDF first");
    setAnalyzing(true);
    const formData = new FormData();
    formData.append("file", tenderFile);
    try {
      const res = await axios.post(`${API}/tender/upload`, formData);
      setTenderData(res.data.tender);
      addAudit(`Tender uploaded: ${tenderFile.name}`, "success");
      addAudit(`${res.data.tender.criteria.length} criteria extracted by Gemini AI`, "success");
      toast.success(`✓ ${res.data.tender.criteria.length} criteria extracted from tender!`);
      setStep(2);
    } catch (e) {
      toast.error("Upload failed — check backend is running");
      addAudit(`Tender upload failed`, "error");
    }
    setAnalyzing(false);
  };

  const addBidder = () => {
    setBidders(prev => [...prev, { id: Date.now(), name: "", file: null }]);
  };

  const removeBidder = (id) => {
    setBidders(prev => prev.filter(b => b.id !== id));
  };

  const updateBidderName = (id, name) => {
    setBidders(prev => prev.map(b => b.id === id ? { ...b, name } : b));
  };

  const updateBidderFile = (id, file) => {
    setBidders(prev => prev.map(b => b.id === id ? { ...b, file } : b));
  };

  const clearBidderFile = (id) => {
    setBidders(prev => prev.map(b => b.id === id ? { ...b, file: null } : b));
  };

  const runEvaluation = async () => {
    const validBidders = bidders.filter(b => b.name && b.file);
    if (validBidders.length === 0) {
      return toast.warning("Please add at least one bidder with a name and document");
    }
    setAnalyzing(true);

    try { await axios.delete(`${API}/evaluate/clear`); } catch (e) {}

    let allEvals = [];
    let summary = { total: 0, eligible: 0, not_eligible: 0, needs_review: 0 };

    for (let i = 0; i < validBidders.length; i++) {
      const bidder = validBidders[i];
      setCurrentBidderIdx(i);
      addAudit(`Evaluating: ${bidder.name}`, "info");
      toast.info(`Gemini AI analyzing: ${bidder.name}...`);

      const formData = new FormData();
      formData.append("file", bidder.file);
      formData.append("bidder_name", bidder.name);

      try {
        const res = await axios.post(`${API}/evaluate/upload-bidder`, formData, {
          timeout: 60000
        });
        if (res.data && res.data.all_evaluations) {
          allEvals = res.data.all_evaluations;
        }
        if (res.data && res.data.summary) {
          summary = res.data.summary;
        }
        if (res.data && res.data.evaluation) {
          addAudit(`${bidder.name}: ${res.data.evaluation.overall_status}`, "success");
          toast.success(`✓ ${bidder.name} evaluated!`);
        }
      } catch (e) {
        addAudit(`Failed to evaluate: ${bidder.name} — ${e.message}`, "error");
        toast.error(`Failed: ${bidder.name} — try demo mode`);
      }
    }

    setCurrentBidderIdx(-1);
    setAnalyzing(false);

    if (allEvals.length > 0) {
      summary.total = allEvals.length;
      summary.eligible = allEvals.filter(e => e.overall_status === "Eligible").length;
      summary.not_eligible = allEvals.filter(e => e.overall_status === "Not Eligible").length;
      summary.needs_review = allEvals.filter(e => e.overall_status === "Needs Review").length;
      addAudit(`Complete — ${summary.eligible} eligible, ${summary.not_eligible} failed, ${summary.needs_review} review`, "success");
      onComplete(tenderData, allEvals, summary);
    } else {
      toast.error("No evaluations completed — check if backend is running and Gemini key is valid");
    }
  };

  const resetAll = () => {
    setStep(1);
    setTenderFile(null);
    setTenderData(null);
    setBidders([{ id: 1, name: "", file: null }]);
    setCurrentBidderIdx(-1);
    addAudit("Session reset by user", "info");
  };

  const validBidderCount = bidders.filter(b => b.name && b.file).length;

  return (
    <div className="wizard">
      <div className="wizard-steps">
        {["Upload Tender", "Add Bidders", "Run Evaluation"].map((s, i) => (
          <div key={i} className={`wizard-step ${step === i + 1 ? "wizard-step--active" : step > i + 1 ? "wizard-step--done" : ""}`}>
            <div className="wizard-step-num">{step > i + 1 ? "✓" : i + 1}</div>
            <span className="wizard-step-label">{s}</span>
            {i < 2 && <div className="wizard-step-line"></div>}
          </div>
        ))}
        <button className="btn-reset" onClick={resetAll}>↺ Reset</button>
      </div>

      {step === 1 && (
        <div className="wizard-card">
          <div className="wizard-card-header">
            <span className="wizard-card-icon">📄</span>
            <div>
              <h3 className="wizard-card-title">Step 1 — Upload Tender Document</h3>
              <p className="wizard-card-sub">Upload the official tender PDF. Gemini AI will read and extract all eligibility criteria automatically.</p>
            </div>
          </div>
          <div className="wizard-upload-zone">
            {!tenderFile ? (
              <>
                <input type="file" accept=".pdf,.docx" id="tender-file" className="file-input"
                  onChange={e => setTenderFile(e.target.files[0])} />
                <label htmlFor="tender-file" className="upload-zone-label">
                  <span className="upload-zone-icon">📁</span>
                  <span className="upload-zone-text">Click to select Tender PDF or DOCX</span>
                  <span className="upload-zone-hint">Gemini AI will extract all eligibility criteria</span>
                </label>
              </>
            ) : (
              <div className="uploaded-file-row">
                <span className="uploaded-file-icon">📄</span>
                <div className="uploaded-file-info">
                  <span className="uploaded-file-name">{tenderFile.name}</span>
                  <span className="uploaded-file-size">{(tenderFile.size / 1024).toFixed(0)} KB</span>
                </div>
                <button className="btn-clear-file" onClick={() => setTenderFile(null)}>✕ Remove</button>
              </div>
            )}
          </div>
          <div className="wizard-actions">
            <button className="btn-demo-small" onClick={onDemo} disabled={loading || analyzing}>
              ✦ Use Demo Data Instead
            </button>
            <button className="btn-primary-wizard" onClick={uploadTenderFile}
              disabled={!tenderFile || analyzing}>
              {analyzing ? "⟳ Gemini AI reading tender..." : "Extract Criteria →"}
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="wizard-card">
          <div className="wizard-card-header">
            <span className="wizard-card-icon">👥</span>
            <div>
              <h3 className="wizard-card-title">Step 2 — Add Bidder Submissions</h3>
              <p className="wizard-card-sub">Add each bidder with their name and ONE document (PDF or image). Gemini AI will read each document and evaluate it against the tender criteria.</p>
            </div>
            <button className="btn-back" onClick={() => setStep(1)}>← Back</button>
          </div>

          {tenderData && (
            <div className="tender-loaded-banner">
              ✓ Tender: <strong>{tenderData.title}</strong> — {tenderData.criteria.length} criteria ready for evaluation
            </div>
          )}

          <div className="bidders-list">
            {bidders.map((bidder, idx) => (
              <div key={bidder.id} className="bidder-upload-card">
                <div className="bidder-upload-header">
                  <span className="bidder-upload-num">Bidder {idx + 1}</span>
                  {bidder.name && bidder.file && (
                    <span className="bidder-ready-tag">✓ Ready</span>
                  )}
                  {bidders.length > 1 && (
                    <button className="btn-remove-bidder" onClick={() => removeBidder(bidder.id)}>✕ Remove</button>
                  )}
                </div>
                <input
                  type="text"
                  className="bidder-name-input"
                  placeholder="Enter company / bidder name (e.g. Apex Construction Ltd)"
                  value={bidder.name}
                  onChange={e => updateBidderName(bidder.id, e.target.value)}
                />
                <div className="bidder-files-zone">
                  {!bidder.file ? (
                    <>
                      <input type="file" accept=".pdf,.docx,.jpg,.jpeg,.png"
                        id={`bidder-file-${bidder.id}`} className="file-input"
                        onChange={e => updateBidderFile(bidder.id, e.target.files[0])} />
                      <label htmlFor={`bidder-file-${bidder.id}`} className="bidder-upload-label">
                        <span>📁 Click to attach bidder document</span>
                        <span className="upload-zone-hint">PDF · DOCX · JPG · PNG — Gemini will read it</span>
                      </label>
                    </>
                  ) : (
                    <div className="uploaded-file-row">
                      <span className="uploaded-file-icon">
                        {bidder.file.name.match(/\.(jpg|jpeg|png)$/i) ? '🖼️' : '📄'}
                      </span>
                      <div className="uploaded-file-info">
                        <span className="uploaded-file-name">{bidder.file.name}</span>
                        <span className="uploaded-file-size">{(bidder.file.size / 1024).toFixed(0)} KB</span>
                      </div>
                      <button className="btn-clear-file" onClick={() => clearBidderFile(bidder.id)}>✕ Remove</button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="wizard-actions">
            <button className="btn-add-bidder" onClick={addBidder}>+ Add Another Bidder</button>
            <button className="btn-primary-wizard" onClick={() => setStep(3)}
              disabled={validBidderCount === 0}>
              Review {validBidderCount > 0 ? `(${validBidderCount} bidder${validBidderCount > 1 ? "s" : ""})` : ""} →
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="wizard-card">
          <div className="wizard-card-header">
            <span className="wizard-card-icon">🔍</span>
            <div>
              <h3 className="wizard-card-title">Step 3 — Run AI Evaluation</h3>
              <p className="wizard-card-sub">Gemini AI will read each bidder document and evaluate it against every criterion from the tender. This may take 10–30 seconds per bidder.</p>
            </div>
            <button className="btn-back" onClick={() => setStep(2)}>← Back</button>
          </div>

          <div className="review-summary">
            <div className="review-item">
              <span className="review-label">Tender</span>
              <span className="review-val">{tenderData?.title || "Demo"}</span>
            </div>
            <div className="review-item">
              <span className="review-label">Criteria</span>
              <span className="review-val">{tenderData?.criteria?.length || 5} criteria</span>
            </div>
            <div className="review-item">
              <span className="review-label">Bidders</span>
              <span className="review-val">{validBidderCount} bidder(s)</span>
            </div>
            <div className="review-item">
              <span className="review-label">AI Engine</span>
              <span className="review-val">Gemini 2.0 Flash</span>
            </div>
          </div>

          <div className="review-bidders">
            {bidders.filter(b => b.name && b.file).map((b, i) => (
              <div key={b.id} className={`review-bidder-row ${currentBidderIdx === i ? "review-bidder-row--active" : ""}`}>
                <div className="review-bidder-avatar">{b.name.charAt(0)}</div>
                <span className="review-bidder-name">{b.name}</span>
                <span className="review-bidder-files">{b.file?.name}</span>
                {currentBidderIdx === i
                  ? <span className="review-bidder-analyzing">⟳ Analyzing...</span>
                  : currentBidderIdx > i
                  ? <span className="review-bidder-done">✓ Done</span>
                  : <span className="review-bidder-status">Pending</span>}
              </div>
            ))}
          </div>

          <div className="wizard-actions">
            <button className="btn-reset" onClick={resetAll}>↺ Start Over</button>
            <button className="btn-primary-wizard btn-evaluate" onClick={runEvaluation}
              disabled={analyzing || validBidderCount === 0}>
              {analyzing ? `⟳ Gemini analyzing bidder ${currentBidderIdx + 1}/${validBidderCount}...` : `✦ Run AI Evaluation (${validBidderCount} bidder${validBidderCount > 1 ? "s" : ""})`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


// ── MAIN APP ──
export default function App() {
  const [booted, setBooted] = useState(false);
  const [activeTab, setActiveTab] = useState("upload");
  const [tender, setTender] = useState(null);
  const [evaluations, setEvaluations] = useState([]);
  const [summary, setSummary] = useState(null);
  const [selectedBidder, setSelectedBidder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [clock, setClock] = useState(new Date().toLocaleTimeString());
  const [auditLog, setAuditLog] = useState([]);

  useEffect(() => {
    const t = setInterval(() => setClock(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(t);
  }, []);

  const addAudit = (msg, type = "info") => {
    const time = new Date().toLocaleTimeString();
    setAuditLog(prev => [{ msg, type, time }, ...prev].slice(0, 50));
  };

  const handleDemo = async () => {
    setLoading(true);
    addAudit("Demo mode initiated", "info");
    try {
      const tRes = await axios.post(`${API}/tender/demo`);
      setTender(tRes.data.tender);
      addAudit(`Demo tender loaded: ${tRes.data.tender.title}`, "success");
      await new Promise(r => setTimeout(r, 600));
      const eRes = await axios.post(`${API}/evaluate/demo`);
      setEvaluations(eRes.data.evaluations);
      setSummary(eRes.data.summary);
      setSelectedBidder(eRes.data.evaluations[0]);
      eRes.data.evaluations.forEach(e => {
        addAudit(`${e.bidder_name}: ${e.overall_status} (${e.overall_confidence}% confidence)`,
          e.overall_status === "Eligible" ? "success" : e.overall_status === "Not Eligible" ? "error" : "warning");
      });
      toast.success("Demo loaded! Showing results.");
      setActiveTab("dashboard");
    } catch (e) {
      toast.error("Demo failed — is backend running?");
    }
    setLoading(false);
  };

  const handleEvaluationComplete = (tenderData, evals, sum) => {
    setTender(tenderData);
    setEvaluations(evals);
    setSummary(sum);
    setSelectedBidder(evals[0]);
    evals.forEach(e => {
      addAudit(`${e.bidder_name}: ${e.overall_status} (${e.overall_confidence}% confidence)`,
        e.overall_status === "Eligible" ? "success" : e.overall_status === "Not Eligible" ? "error" : "warning");
    });
    addAudit("Evaluation complete — results ready", "success");
    toast.success("Evaluation complete!");
    setActiveTab("dashboard");
  };

  const handleReset = () => {
    setTender(null);
    setEvaluations([]);
    setSummary(null);
    setSelectedBidder(null);
    setActiveTab("upload");
    addAudit("Full session reset", "info");
    toast.info("Session cleared — ready for new tender");
  };

  const downloadReport = async () => {
    addAudit("PDF report export requested", "info");
    try {
      const res = await axios.get(`${API}/report/generate`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `TenderTrace_Report_${Date.now()}.pdf`;
      a.click();
      toast.success("Report downloaded!");
      addAudit("PDF report exported successfully", "success");
    } catch (e) {
      toast.error("Report generation failed");
    }
  };

  const tabs = [
    { id: "upload", label: "New Evaluation" },
    { id: "dashboard", label: "Dashboard" },
    { id: "criteria", label: "Criteria" },
    { id: "results", label: "Results" },
    { id: "comparison", label: "Compare" },
    { id: "audit", label: "Audit Trail" },
  ];

  if (!booted) return <BootScreen onDone={() => setBooted(true)} />;

  return (
    <div className="app">
      <ToastContainer position="top-right" theme="dark" />

      <header className="topbar">
        <div className="topbar-left">
         <img src="/tendertrace-logo.png" alt="TenderTrace" className="topbar-logo-img"
  onError={e => e.target.style.display = "none"} />
          <div>
            <div className="topbar-brand">TenderTrace <span className="topbar-ai">AI</span></div>
            <div className="topbar-sub">Government Procurement Intelligence</div>
          </div>
        </div>

        <nav className="topbar-nav">
          {tabs.map(t => (
            <button key={t.id}
              className={`nav-btn ${activeTab === t.id ? "nav-btn--active" : ""}`}
              onClick={() => setActiveTab(t.id)}>
              {t.label}
              {t.id === "results" && evaluations.length > 0 &&
                <span className="nav-count">{evaluations.length}</span>}
              {t.id === "audit" && auditLog.length > 0 &&
                <span className="nav-count">{auditLog.length}</span>}
            </button>
          ))}
        </nav>

        <div className="topbar-right">
          {evaluations.length > 0 && (
            <>
              <button className="btn-export" onClick={downloadReport}>↓ Export Report</button>
              <button className="btn-reset-top" onClick={handleReset} title="Clear all and start fresh">↺ New</button>
            </>
          )}
          <span className="topbar-clock">{clock}</span>
        </div>
      </header>

      <div className="app-body">

        {/* UPLOAD / NEW EVALUATION TAB */}
        {activeTab === "upload" && (
          <div className="upload-page">
            <div className="upload-page-header">
              <div>
                <h2 className="page-title">New Tender Evaluation</h2>
                <p className="page-sub">Upload a tender document and bidder submissions to begin AI-powered evaluation</p>
              </div>
              {evaluations.length > 0 && (
                <div className="existing-eval-banner">
                  ⚡ You have an existing evaluation — <button className="link-btn" onClick={() => setActiveTab("dashboard")}>View Results</button> or continue below to start a new one
                </div>
              )}
            </div>
            <UploadWizard onComplete={handleEvaluationComplete} onDemo={handleDemo} loading={loading} addAudit={addAudit} />
          </div>
        )}

        {/* DASHBOARD TAB */}
        {activeTab === "dashboard" && (
          <div className="inner-page">
            {!evaluations.length ? (
              <div className="empty-state">
                <div className="empty-icon">📊</div>
                <h3>No evaluation data yet</h3>
                <p>Go to New Evaluation and load the demo or upload your documents</p>
                <button className="btn-demo" onClick={() => setActiveTab("upload")}>Start Evaluation</button>
              </div>
            ) : (
              <>
                <div className="dash-stats">
                  <div className="dash-stat">
                    <div className="dash-stat-num">{summary?.total || 0}</div>
                    <div className="dash-stat-label">Total Bidders</div>
                  </div>
                  <div className="dash-stat dash-stat--pass">
                    <div className="dash-stat-num">{summary?.eligible || 0}</div>
                    <div className="dash-stat-label">Eligible</div>
                  </div>
                  <div className="dash-stat dash-stat--fail">
                    <div className="dash-stat-num">{summary?.not_eligible || 0}</div>
                    <div className="dash-stat-label">Not Eligible</div>
                  </div>
                  <div className="dash-stat dash-stat--review">
                    <div className="dash-stat-num">{summary?.needs_review || 0}</div>
                    <div className="dash-stat-label">Needs Review</div>
                  </div>
                  <div className="dash-stat">
                    <div className="dash-stat-num">{tender?.criteria?.length || 0}</div>
                    <div className="dash-stat-label">Criteria Checked</div>
                  </div>
                  <div className="dash-stat">
                    <div className="dash-stat-num">
                      {evaluations.length ? Math.round(evaluations.reduce((a, e) => a + e.overall_confidence, 0) / evaluations.length) : 0}%
                    </div>
                    <div className="dash-stat-label">Avg Confidence</div>
                  </div>
                </div>

                <div className="section-title" style={{ marginTop: "8px" }}>Bidder Overview — Click any card to view details</div>
                <div className="dash-bidder-grid">
                  {evaluations.map(e => {
                    const passed = e.criteria_results.filter(c => c.status === "Pass").length;
                    const total = e.criteria_results.length;
                    const sc = e.overall_status === "Eligible" ? "dash-bidder--pass" :
                      e.overall_status === "Not Eligible" ? "dash-bidder--fail" : "dash-bidder--review";
                    return (
                      <div key={e.bidder_name} className={`dash-bidder-card ${sc}`}
                        onClick={() => { setSelectedBidder(e); setActiveTab("results"); }}>
                        <div className="dash-bidder-top">
                          <div className="dash-avatar">{e.bidder_name.charAt(0)}</div>
                          <div className="dash-bidder-info">
                            <div className="dash-bidder-name">{e.bidder_name}</div>
                            <StatusBadge status={e.overall_status} />
                          </div>
                          <ConfidenceBadge score={e.overall_confidence} />
                        </div>
                        <div className="dash-criteria-dots">
                          {e.criteria_results.map(cr => (
                            <div key={cr.criterion_id}
                              className={`dash-dot ${cr.status === "Pass" ? "dash-dot--pass" : cr.status === "Fail" ? "dash-dot--fail" : "dash-dot--review"}`}
                              title={`${cr.criterion_name}: ${cr.status}`}>
                            </div>
                          ))}
                        </div>
                        <div className="dash-progress-wrap">
                          <div className="dash-progress-track2">
                            <div className="dash-progress-fill2" style={{ width: `${(passed / total) * 100}%` }}></div>
                          </div>
                          <span className="dash-progress-txt">{passed}/{total} criteria passed</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="dash-actions">
                  <button className="btn-export" onClick={downloadReport}>↓ Export PDF Report</button>
                  <button className="btn-reset" onClick={handleReset}>↺ Start New Evaluation</button>
                </div>
              </>
            )}
          </div>
        )}

        {/* CRITERIA TAB */}
        {activeTab === "criteria" && (
          <div className="inner-page">
            {!tender ? (
              <div className="empty-state">
                <div className="empty-icon">📄</div>
                <h3>No tender loaded</h3>
                <p>Go to New Evaluation and upload a tender document</p>
                <button className="btn-demo" onClick={() => setActiveTab("upload")}>Go to Upload</button>
              </div>
            ) : (
              <>
                <div className="page-header">
                  <div>
                    <h2 className="page-title">{tender.title}</h2>
                    <p className="page-sub">{tender.criteria.length} eligibility criteria extracted by Gemini AI</p>
                  </div>
                  <button className="btn-reset" onClick={handleReset}>↺ New Evaluation</button>
                </div>
                <div className="criteria-grid">
                  {tender.criteria.map(c => (
                    <div key={c.id} className={`criterion-card ${c.mandatory ? "criterion-card--mandatory" : "criterion-card--optional"}`}>
                      <div className="criterion-top">
                        <span className="criterion-id">{c.id}</span>
                        <span className={`criterion-type type-${c.type}`}>{c.type}</span>
                        <span className={`criterion-mandatory ${c.mandatory ? "mand-yes" : "mand-no"}`}>
                          {c.mandatory ? "Mandatory" : "Optional"}
                        </span>
                      </div>
                      <h4 className="criterion-name">{c.name}</h4>
                      <p className="criterion-desc">{c.description}</p>
                      <div className="criterion-threshold">
                        <span className="threshold-label">Threshold</span>
                        <span className="threshold-val">{c.threshold}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* RESULTS TAB */}
        {activeTab === "results" && (
          <div className="inner-page">
            {!evaluations.length ? (
              <div className="empty-state">
                <div className="empty-icon">📊</div>
                <h3>No evaluations yet</h3>
                <p>Go to New Evaluation to begin</p>
                <button className="btn-demo" onClick={() => setActiveTab("upload")}>Start Evaluation</button>
              </div>
            ) : (
              <>
                <div className="summary-bar">
                  <div className="summary-stat">
                    <span className="summary-num">{summary?.total || 0}</span>
                    <span className="summary-label">Total</span>
                  </div>
                  <div className="summary-div"></div>
                  <div className="summary-stat">
                    <span className="summary-num summary-pass">{summary?.eligible || 0}</span>
                    <span className="summary-label">Eligible</span>
                  </div>
                  <div className="summary-div"></div>
                  <div className="summary-stat">
                    <span className="summary-num summary-fail">{summary?.not_eligible || 0}</span>
                    <span className="summary-label">Not Eligible</span>
                  </div>
                  <div className="summary-div"></div>
                  <div className="summary-stat">
                    <span className="summary-num summary-review">{summary?.needs_review || 0}</span>
                    <span className="summary-label">Needs Review</span>
                  </div>
                  <div style={{ marginLeft: "auto", display: "flex", gap: "10px" }}>
                    <button className="btn-export" onClick={downloadReport}>↓ Export PDF</button>
                    <button className="btn-reset" onClick={handleReset}>↺ New</button>
                  </div>
                </div>

                <div className="results-layout">
                  <div className="bidder-list">
                    <div className="section-title">Select a Bidder</div>
                    {evaluations.map(e => (
                      <BidderCard key={e.bidder_name} evaluation={e}
                        isSelected={selectedBidder?.bidder_name === e.bidder_name}
                        onClick={() => setSelectedBidder(e)} />
                    ))}
                  </div>

                  {selectedBidder && (
                    <div className="detail-panel">
                      <div className="detail-header">
                        <div className="detail-avatar">{selectedBidder.bidder_name.charAt(0)}</div>
                        <div>
                          <h3 className="detail-name">{selectedBidder.bidder_name}</h3>
                          <div className="detail-badges">
                            <StatusBadge status={selectedBidder.overall_status} />
                            <ConfidenceBadge score={selectedBidder.overall_confidence} />
                          </div>
                        </div>
                      </div>

                      {selectedBidder.overall_status === "Eligible" && (
                        <div className="pass-alert">✓ ELIGIBLE — Meets all mandatory criteria and may proceed.</div>
                      )}
                      {selectedBidder.overall_status === "Not Eligible" && (
                        <div className="fail-alert">✕ NOT ELIGIBLE — Failed one or more mandatory criteria.</div>
                      )}
                      {selectedBidder.overall_status === "Needs Review" && (
                        <div className="review-alert">⚠ HUMAN REVIEW REQUIRED — Ambiguous cases detected. Manual verification required.</div>
                      )}

                      <div className="section-title" style={{ marginTop: "16px" }}>Criterion-Level Evaluation</div>
                      <div className="criteria-results">
                        {selectedBidder.criteria_results.map(cr => (
                          <CriterionRow key={cr.criterion_id} cr={cr} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* COMPARISON TAB */}
        {activeTab === "comparison" && (
          <div className="inner-page">
            {!evaluations.length ? (
              <div className="empty-state">
                <div className="empty-icon">⚖️</div>
                <h3>No data to compare</h3>
                <p>Run an evaluation first to see the comparison</p>
                <button className="btn-demo" onClick={() => setActiveTab("upload")}>Start Evaluation</button>
              </div>
            ) : (
              <>
                <div className="page-header">
                  <h2 className="page-title">Bidder Comparison</h2>
                  <p className="page-sub">Side-by-side matrix — all bidders vs every criterion</p>
                  <button className="btn-reset" onClick={handleReset}>↺ New Evaluation</button>
                </div>
                <ComparisonTable evaluations={evaluations} />
                <div style={{ marginTop: "24px" }}>
                  <div className="section-title">Summary Cards</div>
                  <div className="comparison-cards">
                    {evaluations.map(e => (
                      <div key={e.bidder_name}
                        className={`comp-card ${e.overall_status === "Eligible" ? "comp-pass" : e.overall_status === "Not Eligible" ? "comp-fail" : "comp-review"}`}>
                        <div className="comp-avatar">{e.bidder_name.charAt(0)}</div>
                        <div className="comp-name">{e.bidder_name}</div>
                        <StatusBadge status={e.overall_status} />
                        <ConfidenceBadge score={e.overall_confidence} />
                        <div className="comp-count">
                          {e.criteria_results.filter(c => c.status === "Pass").length}/{e.criteria_results.length} passed
                        </div>
                        <div className="comp-dots">
                          {e.criteria_results.map(cr => (
                            <div key={cr.criterion_id}
                              className={`mini-dot ${cr.status === "Pass" ? "mini-dot--pass" : cr.status === "Fail" ? "mini-dot--fail" : "mini-dot--review"}`}
                              title={`${cr.criterion_name}: ${cr.status}`}>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* AUDIT TRAIL TAB */}
        {activeTab === "audit" && (
          <div className="inner-page">
            <div className="page-header">
              <div>
                <h2 className="page-title">Audit Trail</h2>
                <p className="page-sub">Complete log of every action and AI decision — suitable for formal government procurement</p>
              </div>
              {auditLog.length > 0 && (
                <button className="btn-reset" onClick={() => setAuditLog([])}>✕ Clear Log</button>
              )}
            </div>
            <AuditTrail entries={auditLog} />
          </div>
        )}

      </div>

      <footer className="app-footer">
  <span>TenderTrace AI · Powered by Google Gemini 1.5 Pro</span>
  <span className="footer-sep">|</span>
  <span>Every verdict is explainable and audit-ready</span>
</footer>
    </div>
  );
}