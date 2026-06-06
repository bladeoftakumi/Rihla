/* planner.jsx — input form, validation, unit toggle, call estimate */
const { useState: usePState, useMemo: usePMemo } = React;

const DEFAULTS = {
  city: "",
  radius: 15,
  units: "mi",
  keywords: "mosque, Islamic center, Quran school",
  apiKey: "",
  cap: 100,
  startTime: "09:00",
  sitesPerDay: 5,
  days: 3,
};

function parseKeywords(str) {
  return [...new Set(str.split(",").map((s) => s.trim()).filter(Boolean))];
}

function PlannerForm({ initial, onRun, onSample }) {
  const [v, setV] = usePState({ ...DEFAULTS, ...(initial || {}) });
  const [err, setErr] = usePState({});
  const set = (k) => (e) => {
    const val = e && e.target ? (e.target.type === "number" ? e.target.value : e.target.value) : e;
    setV((p) => ({ ...p, [k]: val }));
  };

  const keywords = usePMemo(() => parseKeywords(v.keywords), [v.keywords]);
  const estimate = usePMemo(
    () => estimateCalls(keywords.length || 1, Number(v.sitesPerDay) || 1, Number(v.days) || 1),
    [keywords.length, v.sitesPerDay, v.days]
  );
  const overCap = Number(v.cap) > 0 && estimate > Number(v.cap);
  const nearCap = !overCap && Number(v.cap) > 0 && estimate >= Number(v.cap) * 0.8;

  function validate() {
    const n = {};
    if (!v.city.trim()) n.city = "A start location is required.";
    if (!(Number(v.radius) > 0)) n.radius = "Enter a radius greater than 0.";
    else if (toMeters(Number(v.radius), v.units) > 50000)
      n.radius = `Max radius is ${v.units === "km" ? "50 km" : "31 mi"} (Places API limit).`;
    if (!keywords.length) n.keywords = "Add at least one keyword.";
    else if (keywords.length > 5) n.keywords = `Up to 5 keywords (you have ${keywords.length}) — each is a separate API search.`;
    if (!v.apiKey.trim()) n.apiKey = "A Google Maps API key is required for live results.";
    if (!(Number(v.cap) > 0)) n.cap = "Set a usage cap of at least 1.";
    if (!(Number(v.sitesPerDay) >= 1)) n.sitesPerDay = "At least 1 site per day.";
    if (!(Number(v.days) >= 1)) n.days = "At least 1 day.";
    if (!v.startTime) n.startTime = "Pick a start time.";
    return n;
  }

  const submit = (e) => {
    e.preventDefault();
    const n = validate();
    if (overCap) n.cap = `Estimated ${estimate} calls exceeds your cap of ${v.cap}. Raise the cap or reduce sites/keywords.`;
    setErr(n);
    if (Object.keys(n).length) return;
    onRun({
      apiKey: v.apiKey.trim(),
      city: v.city.trim(),
      keywords,
      radiusMeters: toMeters(Number(v.radius), v.units),
      units: v.units,
      sitesPerDay: Number(v.sitesPerDay),
      days: Number(v.days),
      startTime: v.startTime,
      cap: Number(v.cap),
    });
  };

  const [showKey, setShowKey] = usePState(false);
  const F = ({ k, children }) => err[k] ? <span className="err-msg">{err[k]}</span> : children || null;

  return (
    <div className="page">
      <div className="page-head">
        <h1 className="page-title">Plan an outreach route</h1>
        <p className="page-desc">
          Search for mosques, Islamic centers and schools in a city, then auto-build day-by-day driving
          itineraries optimized for the least time on the road — with live traffic.
        </p>
      </div>

      <form className="card card-pad" onSubmit={submit} noValidate>
        <div className="form-grid">
          {/* Start location */}
          <div className="field field-full">
            <label className="label" htmlFor="f-city">Start location <span className="req">*</span></label>
            <input id="f-city" className={"input" + (err.city ? " input-invalid" : "")}
              placeholder="e.g. 1200 Main St, Houston, TX — or just a city" value={v.city} onChange={set("city")} />
            <F k="city"><span className="hint">Your starting point — a home/office address or a city. Routes begin here and sites are searched around it.</span></F>
          </div>

          {/* Radius + units */}
          <div className="field">
            <label className="label" htmlFor="f-radius">Search radius <span className="req">*</span></label>
            <div className="input-row">
              <input id="f-radius" type="number" min="1" step="1"
                className={"input" + (err.radius ? " input-invalid" : "")}
                value={v.radius} onChange={set("radius")} />
              <div className="seg" role="group" aria-label="Units">
                <button type="button" className={v.units === "mi" ? "on" : ""} onClick={() => set("units")("mi")}>mi</button>
                <button type="button" className={v.units === "km" ? "on" : ""} onClick={() => set("units")("km")}>km</button>
              </div>
            </div>
            <F k="radius"><span className="hint">Distance from the city center.</span></F>
          </div>

          {/* Start time */}
          <div className="field">
            <label className="label" htmlFor="f-time">Visit start time <span className="req">*</span></label>
            <input id="f-time" type="time" className={"input" + (err.startTime ? " input-invalid" : "")}
              value={v.startTime} onChange={set("startTime")} />
            <F k="startTime"><span className="hint">Used to factor in traffic for each day.</span></F>
          </div>

          {/* Keywords */}
          <div className="field field-full">
            <label className="label" htmlFor="f-kw">Keywords to search <span className="req">*</span></label>
            <input id="f-kw" className={"input" + (err.keywords ? " input-invalid" : "")}
              value={v.keywords} onChange={set("keywords")} placeholder="mosque, Islamic center, Quran school" />
            <F k="keywords">
              <span className="hint">
                Comma-separated, up to 5. {keywords.length > 0 && <b>{keywords.length} term{keywords.length > 1 ? "s" : ""}</b>} — each runs as a separate search.
              </span>
            </F>
          </div>

          {/* Sites per day */}
          <div className="field">
            <label className="label" htmlFor="f-spd">Sites per day <span className="req">*</span></label>
            <input id="f-spd" type="number" min="1" max="15" step="1"
              className={"input" + (err.sitesPerDay ? " input-invalid" : "")}
              value={v.sitesPerDay} onChange={set("sitesPerDay")} />
            <F k="sitesPerDay" />
          </div>

          {/* Days */}
          <div className="field">
            <label className="label" htmlFor="f-days">Days available <span className="req">*</span></label>
            <input id="f-days" type="number" min="1" max="14" step="1"
              className={"input" + (err.days ? " input-invalid" : "")}
              value={v.days} onChange={set("days")} />
            <F k="days"><span className="hint">Up to <b>{(Number(v.sitesPerDay) || 0) * (Number(v.days) || 0)}</b> sites total.</span></F>
          </div>
        </div>

        <div className="divider-or">API access</div>

        <div className="form-grid">
          {/* API key */}
          <div className="field field-full">
            <label className="label" htmlFor="f-key">Google Maps API key <span className="req">*</span></label>
            <div className="key-wrap">
              <input id="f-key" className={"input mono" + (err.apiKey ? " input-invalid" : "")}
                type={showKey ? "text" : "password"} autoComplete="off" spellCheck="false"
                placeholder="AIza…" value={v.apiKey} onChange={set("apiKey")} style={{ paddingRight: 64 }} />
              <button type="button" className="key-toggle" onClick={() => setShowKey((s) => !s)}>
                {showKey ? "hide" : "show"}
              </button>
            </div>
            <F k="apiKey">
              <span className="hint">
                Needs <b>Places API (New)</b> and <b>Routes API</b> enabled. The key is used only in your browser and never stored or sent anywhere else.
              </span>
            </F>
          </div>

          {/* Cap */}
          <div className="field">
            <label className="label" htmlFor="f-cap">API usage cap <span className="req">*</span></label>
            <input id="f-cap" type="number" min="1" step="1"
              className={"input" + (err.cap ? " input-invalid" : "")}
              value={v.cap} onChange={set("cap")} />
            <F k="cap"><span className="hint">Max API calls allowed for this run.</span></F>
          </div>

          <div className="field" style={{ justifyContent: "flex-end" }}>
            <div className={"banner " + (overCap ? "banner-danger" : nearCap ? "banner-warn" : "banner-info")} style={{ padding: "10px 13px" }}>
              <span className="banner-icon">{overCap || nearCap ? <IconWarn size={16} /> : <IconInfo size={16} />}</span>
              <span>
                Estimated <b>{estimate}</b> call{estimate !== 1 ? "s" : ""} this run
                {overCap ? " — over your cap." : nearCap ? " — near your cap." : "."}
              </span>
            </div>
          </div>
        </div>

        <div className="form-foot">
          <button type="button" className="btn btn-quiet" onClick={onSample}>
            <IconSparkle size={15} /> Preview a sample itinerary (no API calls)
          </button>
          <button type="submit" className="btn btn-primary btn-lg" disabled={overCap}>
            <IconRoute size={17} /> Build itinerary
          </button>
        </div>
      </form>
    </div>
  );
}

Object.assign(window, { PlannerForm });
