/* app.jsx — orchestrator: auth gate, nav, run pipeline, progress, errors */
const { useState: useAState, useEffect: useAEffect, useRef: useARef } = React;

const STEPS = [
  { key: "locate", label: "Locating city center" },
  { key: "search", label: "Searching for sites" },
  { key: "optimize", label: "Optimizing routes with traffic" },
  { key: "done", label: "Building itinerary" },
];

function Nav({ onHome, mode }) {
  return (
    <nav className="nav">
      <button className="brand brand-btn" onClick={onHome} title="Home">
        <BrandMark size={30} />
        <div>
          <div className="brand-name">Rihla</div>
          <div className="brand-sub">Outreach Toolkit</div>
        </div>
      </button>
      {mode !== "home" && (
        <div className="nav-mode">
          <span className="nav-mode-tag">{mode === "planner" ? "Route Planner" : "Organizer"}</span>
          <button className="btn btn-quiet btn-sm" onClick={onHome}><IconArrowLeft size={14} /> Switch</button>
        </div>
      )}
    </nav>
  );
}

function Landing({ onPlanner, onOrganizer }) {
  return (
    <div className="page landing">
      <div className="landing-head">
        <h1 className="landing-title">Plan routes. Organize outreach.</h1>
        <p className="landing-sub">
          Build an optimized multi-day visiting route, then track every contact, appointment and note — all in one place.
        </p>
      </div>
      <div className="choice-grid">
        <button className="choice-card" onClick={onPlanner}>
          <span className="choice-icon"><IconRoute size={24} /></span>
          <span className="choice-name">Route Planner</span>
          <span className="choice-desc">Find schools and sites near a start location and route them across days for the least drive time.</span>
          <span className="choice-cta">Start planning <IconArrowRight size={15} /></span>
        </button>
        <button className="choice-card" onClick={onOrganizer}>
          <span className="choice-icon"><IconClipboard size={24} /></span>
          <span className="choice-name">Outreach Organizer</span>
          <span className="choice-desc">Upload your planner export to log contacts, book appointments and track each school’s status.</span>
          <span className="choice-cta">Open organizer <IconArrowRight size={15} /></span>
        </button>
      </div>
      <div className="landing-flow">
        <span>Plan a route</span><IconArrowRight size={13} />
        <span>Export to Excel</span><IconArrowRight size={13} />
        <span>Organize your outreach</span>
      </div>
    </div>
  );
}

function Loading({ step, usage }) {
  const activeIdx = STEPS.findIndex((s) => s.key === step);
  const pct = usage.cap && usage.cap !== Infinity ? Math.min(100, (usage.count / usage.cap) * 100) : 0;
  const warn = pct >= 80;
  return (
    <div className="page">
      <div className="card card-pad">
        <div className="loading-wrap">
          <div className="spinner" />
          <div className="loading-steps">
            {STEPS.map((s, i) => {
              const state = i < activeIdx ? "done" : i === activeIdx ? "active" : "";
              return (
                <div className={"lstep " + state} key={s.key}>
                  <span className="lstep-dot">{i < activeIdx ? <IconCheck size={11} /> : i + 1}</span>
                  {s.label}
                </div>
              );
            })}
          </div>
          {usage.cap !== Infinity && (
            <div className="usage-meter">
              <div className="usage-bar">
                <div className={"usage-fill" + (warn ? " warn" : "")} style={{ width: pct + "%" }} />
              </div>
              <div className="usage-label">
                <span>API calls used</span>
                <span>{usage.count} / {usage.cap}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PlannerApp() {
  const [view, setView] = useAState("form"); // form | loading | results
  const [step, setStep] = useAState("locate");
  const [usage, setUsage] = useAState({ count: 0, cap: Infinity });
  const [result, setResult] = useAState(null);
  const [error, setError] = useAState(null);
  const [warning, setWarning] = useAState(null);
  const [lastInput, setLastInput] = useAState(null);

  const run = async (input) => {
    setError(null); setWarning(null); setLastInput(input);
    setStep("locate");
    setUsage({ count: 0, cap: input.cap || Infinity });
    setView("loading");

    const tracker = new UsageTracker(input.cap, (count, cap, label) => {
      setUsage({ count, cap });
      if (cap !== Infinity && count >= cap * 0.8 && count < cap) {
        setWarning(`Heads up — ${count} of ${cap} API calls used (${Math.round((count / cap) * 100)}%).`);
      }
    });

    try {
      const res = await buildItinerary(input, tracker, (s) => setStep(s));
      setResult(res);
      setView("results");
    } catch (e) {
      setError(e.message || "Something went wrong while building the itinerary.");
      setView("form");
    }
  };

  const runSample = () => {
    setError(null); setWarning(null);
    setResult(sampleItinerary());
    setView("results");
  };

  return (
    <React.Fragment>
      {view === "form" && (
        <React.Fragment>
          {error && (
            <div className="page" style={{ paddingBottom: 0 }}>
              <div className="banner banner-danger">
                <span className="banner-icon"><IconWarn size={16} /></span>
                <span><b>Couldn't build itinerary.</b> {error}</span>
              </div>
            </div>
          )}
          <PlannerForm initial={lastInput && {
            ...lastInput,
            radius: lastInput.units === "km" ? Math.round(lastInput.radiusMeters / 1000) : Math.round(lastInput.radiusMeters / 1609.344),
            keywords: lastInput.keywords.join(", "),
            cap: lastInput.cap,
          }} onRun={run} onSample={runSample} />
        </React.Fragment>
      )}

      {view === "loading" && (
        <React.Fragment>
          {warning && (
            <div className="page" style={{ paddingBottom: 0 }}>
              <div className="banner banner-warn">
                <span className="banner-icon"><IconWarn size={16} /></span>
                <span>{warning}</span>
              </div>
            </div>
          )}
          <Loading step={step} usage={usage} />
        </React.Fragment>
      )}

      {view === "results" && result && (
        <ResultsView result={result} onBack={() => { setView("form"); }} />
      )}
    </React.Fragment>
  );
}

function App() {
  const [mode, setMode] = useAState("home"); // home | planner | organizer
  return (
    <React.Fragment>
      <Nav mode={mode} onHome={() => setMode("home")} />
      {mode === "home" && <Landing onPlanner={() => setMode("planner")} onOrganizer={() => setMode("organizer")} />}
      {mode === "planner" && <PlannerApp />}
      {mode === "organizer" && <Organizer />}
      <div className="footer">
        Rihla &middot; routes &amp; traffic by Google Maps &middot; no data leaves your browser
      </div>
    </React.Fragment>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
