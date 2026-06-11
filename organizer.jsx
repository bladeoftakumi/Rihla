/* organizer.jsx — upload a planner Excel, track outreach per school */
const { useState: useOState, useEffect: useOEffect, useRef: useORef, useMemo: useOMemo } = React;

const ORG_KEY = "rihla_organizer_v1";

function loadSaved() {
  try { return JSON.parse(localStorage.getItem(ORG_KEY)); } catch (e) { return null; }
}

/* ---------- empty / upload state ---------- */
function UploadPanel({ onFile, onSample, error, busy }) {
  const inputRef = useORef();
  const [drag, setDrag] = useOState(false);

  const pick = (files) => { if (files && files[0]) onFile(files[0]); };

  return (
    <div className="page">
      <div className="org-intro">
        <h1 className="page-title">Outreach Organizer</h1>
        <p className="page-desc">
          Upload the Excel you downloaded from the Planner. Rihla turns it into a working tracker —
          log contacts, book appointments, set a status and keep notes for every school.
        </p>
      </div>

      {error && (
        <div className="banner banner-danger" style={{ marginBottom: 18 }}>
          <span className="banner-icon"><IconWarn size={16} /></span>
          <span>{error}</span>
        </div>
      )}

      <div
        className={"dropzone" + (drag ? " drag" : "")}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files); }}
        onClick={() => inputRef.current && inputRef.current.click()}
        role="button" tabIndex={0}
      >
        <div className="dropzone-icon"><IconUpload size={26} /></div>
        <div className="dropzone-title">{busy ? "Reading file…" : "Drop your itinerary here"}</div>
        <div className="dropzone-sub">or <span className="dropzone-link">browse</span> for a <b>.xlsx</b> file</div>
        <input ref={inputRef} type="file" accept=".xlsx,.xls" hidden
          onChange={(e) => pick(e.target.files)} />
      </div>

      <div className="org-altrow">
        <span className="org-alt-or">No file yet?</span>
        <button className="btn btn-quiet" onClick={onSample}>
          <IconSparkle size={15} /> Try it with sample data
        </button>
      </div>
    </div>
  );
}

/* ---------- stats ---------- */
function StatPill({ num, label, accent }) {
  return (
    <div className="org-stat">
      <span className={"org-stat-num" + (accent ? " accent" : "")}>{num}</span>
      <span className="org-stat-label">{label}</span>
    </div>
  );
}

/* ---------- dashboard ---------- */
function Dashboard({ data, setData, onReset }) {
  const { records, meta } = data;
  const [query, setQuery] = useOState("");
  const [filter, setFilter] = useOState("All");
  const [savedTick, setSavedTick] = useOState(false);

  // autosave
  useOEffect(() => {
    localStorage.setItem(ORG_KEY, JSON.stringify({ ...data, savedAt: Date.now() }));
    setSavedTick(true);
    const t = setTimeout(() => setSavedTick(false), 1400);
    return () => clearTimeout(t);
  }, [data]);

  const onChange = (uid, patch) =>
    setData((d) => ({ ...d, records: d.records.map((r) => (r.uid === uid ? { ...r, ...patch } : r)) }));

  const counts = useOMemo(() => {
    const c = { total: records.length, contacted: 0, booked: 0, confirmed: 0 };
    records.forEach((r) => {
      const s = statusOf(r.status);
      if (s !== "Not Started") c.contacted++;
      if (s === "Meeting Booked") c.booked++;
      if (s === "Confirmed") c.confirmed++;
    });
    return c;
  }, [records]);

  const filtered = useOMemo(() => {
    const q = query.trim().toLowerCase();
    return records.filter((r) => {
      if (filter !== "All" && statusOf(r.status) !== filter) return false;
      if (!q) return true;
      return [r.name, r.address, r.contactName, r.notes].some((v) => String(v || "").toLowerCase().includes(q));
    });
  }, [records, query, filter]);

  // group filtered by day, preserving order
  const groups = useOMemo(() => {
    const m = new Map();
    filtered.forEach((r) => {
      const key = r.day || "—";
      if (!m.has(key)) m.set(key, []);
      m.get(key).push(r);
    });
    return [...m.entries()];
  }, [filtered]);

  const download = () => {
    const dayLinks = (() => {
      // reconstruct per-day route links from records grouped by day
      const byDay = new Map();
      records.forEach((r) => {
        if (!r.day) return;
        if (!byDay.has(r.day)) byDay.set(r.day, []);
        byDay.get(r.day).push({ name: r.name, address: r.address, lat: r.lat, lng: r.lng });
      });
      const start = meta.start || null;
      return [...byDay.keys()].sort((a, b) => a - b).map((d) =>
        typeof gmapsDayLink === "function" ? gmapsDayLink({ stops: byDay.get(d) }, start) : null);
    })();
    try {
      exportTrackerFromRecords(records, { city: meta.city, days: counts.total ? new Set(records.map(r=>r.day).filter(Boolean)).size : 0, dayLinks });
    } catch (e) { alert("Couldn't export Excel: " + e.message); }
  };

  const FILTERS = ["All", ...STATUS_OPTIONS];

  return (
    <React.Fragment>
      <div className="page page-wide">
        <div className="org-top">
          <div>
            <h1 className="page-title" style={{ marginBottom: 2 }}>{meta.city || "Outreach Tracker"}</h1>
            <p className="page-desc" style={{ margin: 0 }}>
              {counts.total} school{counts.total !== 1 ? "s" : ""} · {savedTick ? <span className="org-saved"><IconCheck size={12} /> saved</span> : "changes save automatically"}
            </p>
          </div>
          <div className="org-top-actions">
            <button className="btn btn-quiet" onClick={onReset}><IconRefresh size={15} /> New file</button>
            <button className="btn btn-primary" onClick={download}><IconDownload size={16} /> Download updated Excel</button>
          </div>
        </div>

        <div className="org-stats">
          <StatPill num={counts.total} label="Schools" />
          <StatPill num={counts.contacted} label="Contacted" />
          <StatPill num={counts.booked} label="Meetings booked" />
          <StatPill num={counts.confirmed} label="Confirmed" accent />
        </div>

        <div className="org-controls">
          <div className="org-search">
            <IconSearch size={15} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search schools, contacts, notes…" />
          </div>
          <div className="org-filters">
            {FILTERS.map((f) => (
              <button key={f} className={"org-filter" + (filter === f ? " active" : "")} onClick={() => setFilter(f)}>
                {f}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="org-empty">No schools match your filters.</div>
        ) : (
          groups.map(([day, recs]) => (
            <div className="org-daygroup" key={day}>
              <div className="org-daylabel">{day === "—" ? "Unassigned" : `Day ${day}`}<span>{recs.length}</span></div>
              <div className="org-cards">
                {recs.map((r) => <SchoolCard key={r.uid} rec={{ ...r, onChange }} />)}
              </div>
            </div>
          ))
        )}
      </div>
    </React.Fragment>
  );
}

/* ---------- orchestrator ---------- */
function Organizer() {
  const [data, setData] = useOState(null);
  const [error, setError] = useOState(null);
  const [busy, setBusy] = useOState(false);
  const [saved] = useOState(loadSaved);
  const [dismissedResume, setDismissedResume] = useOState(false);

  const onFile = async (file) => {
    setBusy(true); setError(null);
    try {
      const parsed = await parseTrackerFile(file);
      if (!parsed.records.length) throw new Error("No schools found in that file.");
      setData(parsed);
    } catch (e) {
      setError(e.message || "Couldn't read that file.");
    } finally { setBusy(false); }
  };

  const onSample = () => {
    const res = sampleItinerary();
    const recs = recordsFromResult(res);
    setData({ records: recs, meta: { city: res.city, start: { lat: res.center.lat, lng: res.center.lng, name: res.city } } });
    setError(null);
  };

  const reset = () => {
    if (!confirm("Start a new file? Your current tracking is saved in this browser and in any Excel you downloaded.")) return;
    setData(null); setError(null);
  };

  if (data) return <Dashboard data={data} setData={setData} onReset={reset} />;

  return (
    <React.Fragment>
      {saved && saved.records && saved.records.length > 0 && !dismissedResume && (
        <div className="page" style={{ paddingBottom: 0 }}>
          <div className="banner banner-info org-resume">
            <span className="banner-icon"><IconClipboard size={16} /></span>
            <span>
              You have saved tracking for <b>{saved.records.length}</b> school{saved.records.length !== 1 ? "s" : ""}
              {saved.meta && saved.meta.city ? ` in ${saved.meta.city}` : ""}.
            </span>
            <span className="org-resume-actions">
              <button className="btn btn-primary btn-sm" onClick={() => setData({ records: saved.records, meta: saved.meta || {} })}>Resume</button>
              <button className="btn btn-quiet btn-sm" onClick={() => setDismissedResume(true)}>Dismiss</button>
            </span>
          </div>
        </div>
      )}
      <UploadPanel onFile={onFile} onSample={onSample} error={error} busy={busy} />
    </React.Fragment>
  );
}

Object.assign(window, { Organizer });
