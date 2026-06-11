/* results.jsx — day-by-day itinerary view + download */
const { useState: useRState } = React;

function gmapsLink(stop) {
  if (stop.lat && stop.lng) {
    return `https://www.google.com/maps/search/?api=1&query=${stop.lat},${stop.lng}&query_place_id=${stop.id || ""}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stop.name + " " + (stop.address || ""))}`;
}

function StopRow({ stop, index, units }) {
  const cats = (stop.matched || []).slice(0, 3);
  return (
    <React.Fragment>
      {stop.driveFromPrev && (
        <div className="stop-drive">
          <IconCar size={14} />
          {fmtDuration(stop.driveFromPrev.seconds)} drive · {fmtDistance(stop.driveFromPrev.meters, units)}
        </div>
      )}
      <div className="stop">
        <div className="stop-rail">
          <div className="stop-num">{index}</div>
          <div className="stop-line" />
        </div>
        <div className="stop-body">
          <div className="stop-name">{stop.name}</div>
          {stop.address && <div className="stop-addr">{stop.address}</div>}
          <div className="stop-cats">
            {cats.map((c, i) => <span className="chip" key={i}>{c}</span>)}
          </div>
          <a className="maplink" href={gmapsLink(stop)} target="_blank" rel="noopener noreferrer">
            Open in Google Maps <IconExternal size={12} />
          </a>
        </div>
      </div>
    </React.Fragment>
  );
}

function DayCard({ day, index, units, start }) {
  const routeUrl = gmapsDayLink(day, start);
  return (
    <div className="card day-card">
      <div className="day-head">
        <div className="day-head-l">
          <span className="day-badge">Day {index + 1}</span>
          <span className="day-title">{day.stops.length} site{day.stops.length !== 1 ? "s" : ""}</span>
        </div>
        <div className="day-meta">
          {fmtDuration(day.totalSeconds)} drive · {fmtDistance(day.totalMeters, units)}
        </div>
      </div>
      <div className="stops">
        {day.stops.map((s, i) => (
          <StopRow key={s.id || i} stop={s} index={i + 1} units={units} />
        ))}
      </div>
      {routeUrl && (
        <div className="day-foot">
          <a className="day-route" href={routeUrl} target="_blank" rel="noopener noreferrer">
            <IconRoute size={15} /> Open this day&rsquo;s route in Google Maps <IconExternal size={12} />
          </a>
        </div>
      )}
    </div>
  );
}

function ResultsView({ result, onBack }) {
  const [downloading, setDownloading] = useRState(false);
  const totalStops = result.days.reduce((a, d) => a + d.stops.length, 0);
  const totalSeconds = result.days.reduce((a, d) => a + d.totalSeconds, 0);
  const dep = result.departure
    ? new Date(result.departure).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    : null;

  const download = () => {
    setDownloading(true);
    try { generatePDF(result, { isSample: !!result.isSample }); }
    catch (e) { alert("Couldn't generate PDF: " + e.message); }
    finally { setTimeout(() => setDownloading(false), 600); }
  };

  return (
    <React.Fragment>
      <div className="page page-wide">
        <button className="btn btn-quiet" onClick={onBack} style={{ marginLeft: -8, marginBottom: 14 }}>
          <IconArrowLeft size={15} /> New search
        </button>

        {result.isSample && (
          <div className="banner banner-info" style={{ marginBottom: 18 }}>
            <span className="banner-icon"><IconSparkle size={16} /></span>
            <span><b>Sample preview.</b> This itinerary uses example data — no API calls were made. Run a real search from the form to use your own city and key.</span>
          </div>
        )}

        {!result.isSample && result.unplacedCount > 0 && (
          <div className="banner banner-warn" style={{ marginBottom: 18 }}>
            <span className="banner-icon"><IconInfo size={16} /></span>
            <span>
              Found <b>{result.foundCount}</b> matching sites — scheduled the <b>{result.placedCount}</b> closest
              across your {result.days.length} day{result.days.length !== 1 ? "s" : ""}.
              {" "}<b>{result.unplacedCount}</b> didn't fit. Add days or sites-per-day to include more.
            </span>
          </div>
        )}

        <div className="results-head">
          <div>
            <h1 className="page-title" style={{ marginBottom: 2 }}>{result.city}</h1>
            <p className="page-desc">
              Optimized for least drive time{dep ? `, departing ${dep} each day` : ""}.
            </p>
            <div className="summary-stats">
              <div className="stat">
                <span className="stat-num">{result.days.length}</span>
                <span className="stat-label">Days</span>
              </div>
              <div className="stat">
                <span className="stat-num">{totalStops}</span>
                <span className="stat-label">Sites</span>
              </div>
              <div className="stat">
                <span className="stat-num">{fmtDuration(totalSeconds)}</span>
                <span className="stat-label">Total drive</span>
              </div>
            </div>
          </div>
          <button className="btn btn-primary btn-lg" onClick={download} disabled={downloading}>
            <IconDownload size={17} /> {downloading ? "Preparing…" : "Download PDF"}
          </button>
        </div>

        <div>
          {result.days.map((d, i) => <DayCard key={i} day={d} index={i} units={result.units} start={result.center ? { lat: result.center.lat, lng: result.center.lng, name: result.city } : null} />)}
        </div>
      </div>

      <div className="download-bar">
        <span className="download-bar-info">
          {totalStops} sites · {result.days.length} day{result.days.length !== 1 ? "s" : ""} · {fmtDuration(totalSeconds)} total drive
        </span>
        <button className="btn btn-primary" onClick={download} disabled={downloading}>
          <IconDownload size={16} /> {downloading ? "Preparing…" : "Download itinerary PDF"}
        </button>
      </div>
    </React.Fragment>
  );
}

Object.assign(window, { ResultsView });
