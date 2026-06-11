/* api.jsx — Google Maps Places API (New) + Routes API helpers, usage tracking, sample data */

const PLACES_URL = "https://places.googleapis.com/v1/places:searchText";
const ROUTES_URL = "https://routes.googleapis.com/directions/v2:computeRoutes";
const MAX_OPTIMIZE_WAYPOINTS = 23; // single-call optimize ceiling

/* ---- unit + format helpers ---- */
const toMeters = (value, unit) => Math.round(value * (unit === "km" ? 1000 : 1609.344));
const metersToUnit = (m, unit) => unit === "km" ? m / 1000 : m / 1609.344;

function fmtDistance(meters, unit) {
  const v = metersToUnit(meters, unit);
  return `${v < 10 ? v.toFixed(1) : Math.round(v)} ${unit === "km" ? "km" : "mi"}`;
}
function fmtDuration(seconds) {
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60), r = m % 60;
  return r ? `${h} hr ${r} min` : `${h} hr`;
}
function parseSeconds(dur) {
  // Routes API durations look like "1234s"
  if (typeof dur === "string") return parseFloat(dur.replace("s", "")) || 0;
  return 0;
}
function haversine(a, b) {
  const R = 6371000, toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/* departure time: next occurrence of HH:MM (today if still ahead, else tomorrow) */
function nextDeparture(timeStr) {
  const [h, m] = (timeStr || "09:00").split(":").map(Number);
  const now = new Date();
  const d = new Date();
  d.setHours(h, m || 0, 0, 0);
  if (d.getTime() <= now.getTime() + 60000) d.setDate(d.getDate() + 1);
  return d;
}

/* ---- usage tracker ---- */
class UsageTracker {
  constructor(cap, onUpdate) {
    this.cap = cap > 0 ? cap : Infinity;
    this.count = 0;
    this.onUpdate = onUpdate || (() => {});
  }
  // call before making a request; throws if it would exceed the cap
  reserve(label) {
    if (this.count + 1 > this.cap) {
      const e = new Error(`API usage cap reached (${this.cap} calls). Increase your cap to continue.`);
      e.code = "CAP";
      throw e;
    }
    this.count += 1;
    this.onUpdate(this.count, this.cap, label);
    return this.count;
  }
}

/* ---- low-level fetchers ---- */
async function placesSearch({ apiKey, textQuery, center, radiusMeters, maxResultCount = 20 }) {
  const body = {
    textQuery,
    maxResultCount,
    languageCode: "en",
  };
  if (center && radiusMeters) {
    // Text Search (places:searchText) only accepts a circle under locationBias.
    // locationRestriction on this endpoint supports a rectangle only — passing a
    // circle there returns: Unknown name "circle" at 'location_restriction'.
    body.locationBias = {
      circle: {
        center: { latitude: center.lat, longitude: center.lng },
        radius: Math.min(Math.max(radiusMeters, 1), 50000),
      },
    };
  }
  const res = await fetch(PLACES_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.primaryTypeDisplayName",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await apiError(res, "Places");
  const data = await res.json();
  return (data.places || []).map((p) => ({
    id: p.id,
    name: p.displayName?.text || "Unnamed location",
    address: p.formattedAddress || "",
    type: p.primaryTypeDisplayName?.text || "",
    lat: p.location?.latitude,
    lng: p.location?.longitude,
  })).filter((p) => typeof p.lat === "number" && typeof p.lng === "number");
}

async function computeRoute({ apiKey, origin, destination, intermediates, departureTime, optimize }) {
  const wp = (pt) => ({ location: { latLng: { latitude: pt.lat, longitude: pt.lng } } });
  const body = {
    origin: wp(origin),
    destination: wp(destination),
    intermediates: intermediates.map(wp),
    travelMode: "DRIVE",
    // optimizeWaypointOrder is incompatible with TRAFFIC_AWARE_OPTIMAL — Google
    // rejects the pair. Use TRAFFIC_AWARE when optimizing the stop order,
    // and the higher-quality _OPTIMAL tier only when we aren't reordering.
    routingPreference: optimize ? "TRAFFIC_AWARE" : "TRAFFIC_AWARE_OPTIMAL",
    departureTime: departureTime.toISOString(),
    optimizeWaypointOrder: !!optimize,
    languageCode: "en",
  };
  const res = await fetch(ROUTES_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "routes.optimizedIntermediateWaypointIndex,routes.legs.duration,routes.legs.distanceMeters,routes.duration,routes.distanceMeters",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await apiError(res, "Routes");
  const data = await res.json();
  const route = (data.routes || [])[0];
  if (!route) throw new Error("No drivable route found between these locations.");
  return {
    order: route.optimizedIntermediateWaypointIndex || intermediates.map((_, i) => i),
    legs: (route.legs || []).map((l) => ({
      seconds: parseSeconds(l.duration),
      meters: l.distanceMeters || 0,
    })),
  };
}

async function apiError(res, which) {
  let detail = "";
  try {
    const j = await res.json();
    detail = j?.error?.message || "";
  } catch (e) { /* ignore */ }
  const msg = `${which} API error (${res.status})${detail ? ": " + detail : ""}`;
  const e = new Error(msg);
  e.code = "API";
  e.status = res.status;
  return e;
}

/* ---- top-level pipeline ----
   returns { plan: { city, center, units, departure, days:[{stops, totalSeconds, totalMeters}], unplacedCount } } */
async function buildItinerary(input, usage, onStep) {
  const {
    apiKey, city, keywords, radiusMeters, units,
    sitesPerDay, days, startTime,
  } = input;

  // 1) locate the city center
  onStep("locate");
  usage.reserve("geocode city");
  const cityHits = await placesSearch({ apiKey, textQuery: city, maxResultCount: 1 });
  if (!cityHits.length) throw new Error(`Couldn't locate "${city}". Try a more specific city name.`);
  const center = { lat: cityHits[0].lat, lng: cityHits[0].lng };

  // 2) search each keyword within the radius
  onStep("search");
  const seen = new Map();
  for (const kw of keywords) {
    usage.reserve(`search: ${kw}`);
    const hits = await placesSearch({ apiKey, textQuery: kw, center, radiusMeters, maxResultCount: 20 });
    for (const h of hits) {
      if (!seen.has(h.id)) { h.matched = [kw]; seen.set(h.id, h); }
      else if (!seen.get(h.id).matched.includes(kw)) seen.get(h.id).matched.push(kw);
    }
  }
  let found = [...seen.values()];
  if (!found.length) throw new Error(`No matching locations found in ${city} within the radius. Try widening the radius or adjusting keywords.`);

  // distance from center for selection + ordering fallback
  found.forEach((p) => { p.distFromCenter = haversine(center, p); });
  found.sort((a, b) => a.distFromCenter - b.distFromCenter);

  const capacity = sitesPerDay * days;
  const selected = found.slice(0, capacity);
  const unplacedCount = found.length - selected.length;

  // 3) optimize routes
  onStep("optimize");
  const departure = nextDeparture(startTime);
  let dayGroups;
  if (selected.length <= MAX_OPTIMIZE_WAYPOINTS) {
    dayGroups = await optimizeSingleCall(selected, center, departure, sitesPerDay, days, apiKey, usage);
  } else {
    dayGroups = await optimizePerDay(selected, center, departure, sitesPerDay, days, apiKey, usage);
  }

  onStep("done");
  return {
    city,
    center,
    units,
    departure,
    foundCount: found.length,
    placedCount: selected.length,
    unplacedCount,
    days: dayGroups,
  };
}

/* one optimize call across all selected, then chunk by sitesPerDay */
async function optimizeSingleCall(selected, center, departure, sitesPerDay, days, apiKey, usage) {
  usage.reserve("optimize route");
  const { order, legs } = await computeRoute({
    apiKey, origin: center, destination: center,
    intermediates: selected, departureTime: departure, optimize: true,
  });
  // ordered stops; leg[j] is the drive INTO ordered-stop j (leg 0 = center -> first stop)
  const ordered = order.map((origIdx, j) => ({
    ...selected[origIdx],
    driveFromPrev: legs[j] || null,
  }));
  return chunk(ordered, sitesPerDay, days);
}

/* per-day: chunk nearest-first list into days, optimize each day separately */
async function optimizePerDay(selected, center, departure, sitesPerDay, days, apiKey, usage) {
  const groups = [];
  const chunks = sliceChunks(selected, sitesPerDay, days);
  for (const grp of chunks) {
    if (!grp.length) continue;
    usage.reserve("optimize day route");
    const { order, legs } = await computeRoute({
      apiKey, origin: center, destination: center,
      intermediates: grp, departureTime: departure, optimize: true,
    });
    const ordered = order.map((origIdx, j) => ({
      ...grp[origIdx],
      driveFromPrev: legs[j] || null,
    }));
    groups.push(summarizeDay(ordered));
  }
  return groups;
}

function sliceChunks(arr, per, maxDays) {
  const out = [];
  for (let i = 0; i < arr.length && out.length < maxDays; i += per) out.push(arr.slice(i, i + per));
  return out;
}
function chunk(ordered, per, maxDays) {
  return sliceChunks(ordered, per, maxDays).map(summarizeDay);
}
function summarizeDay(stops) {
  // first stop of a day starts fresh — don't carry an inbound drive leg
  const clean = stops.map((s, i) => ({ ...s, driveFromPrev: i === 0 ? null : s.driveFromPrev }));
  const totalSeconds = clean.reduce((a, s) => a + (s.driveFromPrev?.seconds || 0), 0);
  const totalMeters = clean.reduce((a, s) => a + (s.driveFromPrev?.meters || 0), 0);
  return { stops: clean, totalSeconds, totalMeters };
}

/* estimate API calls for a given config (for the form footer + pre-flight) */
function estimateCalls(keywordCount, sitesPerDay, days) {
  const capacity = sitesPerDay * days;
  const routeCalls = capacity <= MAX_OPTIMIZE_WAYPOINTS ? 1 : days;
  return 1 /* city */ + keywordCount + routeCalls;
}

/* ---- sample itinerary (no API calls) for previewing the output ---- */
function sampleItinerary(city = "Houston, TX", units = "mi") {
  const D = (min, mi) => ({ seconds: min * 60, meters: Math.round(mi * 1609.344) });
  const mk = (name, address, cats) => ({ name, address, matched: cats, lat: 0, lng: 0 });
  const raw = [
    [mk("Masjid Al-Noor Islamic Center", "3110 Eastside St, Houston, TX 77098", ["mosque"]), null],
    [mk("Quba Institute & Quran Academy", "871 Westheimer Rd, Houston, TX 77006", ["Quran school"]), D(9, 2.4)],
    [mk("Bilal Masjid", "12815 Bissonnet St, Houston, TX 77099", ["mosque"]), D(14, 6.1)],
    [mk("Madinah Institute", "9001 W Bellfort Ave, Houston, TX 77031", ["Islamic center", "Quran school"]), D(11, 3.8)],
    [mk("Masjid Hamza", "6233 Hartwick Rd, Houston, TX 77093", ["mosque"]), D(21, 9.7)],
    [mk("River Oaks Islamic Center", "3201 Allen Pkwy, Houston, TX 77019", ["Islamic center"]), null],
    [mk("As-Salam Masjid & School", "10415 Synott Rd, Sugar Land, TX 77498", ["mosque", "Quran school"]), D(13, 5.5)],
    [mk("Clear Lake Islamic Center", "17511 El Camino Real, Houston, TX 77058", ["Islamic center"]), D(24, 12.3)],
  ];
  const stops = raw.map(([s, d]) => ({ ...s, driveFromPrev: d, id: Math.random().toString(36) }));
  const day1 = stops.slice(0, 5);
  const day2 = stops.slice(5);
  const sum = (arr) => ({
    stops: arr.map((s, i) => ({ ...s, driveFromPrev: i === 0 ? null : s.driveFromPrev })),
    totalSeconds: arr.reduce((a, s, i) => a + (i === 0 ? 0 : s.driveFromPrev?.seconds || 0), 0),
    totalMeters: arr.reduce((a, s, i) => a + (i === 0 ? 0 : s.driveFromPrev?.meters || 0), 0),
  });
  return {
    city, center: { lat: 29.76, lng: -95.37 }, units,
    departure: nextDeparture("09:00"),
    foundCount: 8, placedCount: 8, unplacedCount: 0,
    days: [sum(day1), sum(day2)],
    isSample: true,
  };
}

/* ---- Google Maps deep links ---- */
// A single location token for a Maps URL: prefer real coordinates, fall back to text.
function gmapsLoc(p) {
  if (p && typeof p.lat === "number" && typeof p.lng === "number" && (p.lat !== 0 || p.lng !== 0))
    return `${p.lat},${p.lng}`;
  return encodeURIComponent([p && p.name, p && p.address].filter(Boolean).join(", "));
}
// Full driving route for one day: start (home/city) -> each stop in order.
function gmapsDayLink(day, start) {
  const stops = (day && day.stops) || [];
  if (!stops.length) return null;
  const pts = [];
  if (start && (start.lat || start.lng || start.name)) pts.push(start);
  stops.forEach((s) => pts.push(s));
  if (pts.length < 2) return null; // need at least an origin + destination to draw a route
  const origin = gmapsLoc(pts[0]);
  const destination = gmapsLoc(pts[pts.length - 1]);
  const mid = pts.slice(1, -1).map(gmapsLoc);
  let url = `https://www.google.com/maps/dir/?api=1&travelmode=driving&origin=${origin}&destination=${destination}`;
  if (mid.length) url += `&waypoints=${mid.join("%7C")}`;
  return url;
}

Object.assign(window, {
  buildItinerary, estimateCalls, sampleItinerary, UsageTracker,
  fmtDistance, fmtDuration, toMeters, nextDeparture, haversine,
  gmapsLoc, gmapsDayLink,
});
