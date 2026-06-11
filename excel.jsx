/* excel.jsx — SheetJS export/parse for the outreach tracker (shared via window) */

const TRACKER_SHEET = "Outreach Tracker";
const SUMMARY_SHEET = "Summary";

/* Canonical column order. Planner data first, then the tracking columns the
   Organizer fills in. Parsing matches by header NAME, so this order can change
   and old files still load. */
const TRACK_COLS = [
  "Day", "Stop", "School / Site Name", "Address", "Latitude", "Longitude",
  "Maps Link", "Drive From Prev (min)", "Distance From Prev",
  "Status", "Priority", "Contact Name", "Title / Role", "Phone", "Email",
  "Appointment Date", "Appointment Time", "Materials Shared", "Follow-up Date", "Notes",
];

const TRACK_COL_WIDTHS = [
  6, 6, 32, 40, 11, 11, 14, 12, 13,
  16, 10, 20, 18, 16, 26, 16, 14, 26, 14, 46,
].map((w) => ({ wch: w }));

const STATUS_OPTIONS = [
  "Not Started", "Contacted", "Meeting Booked", "Visited", "Confirmed", "Declined",
];

/* single Maps link for one site/record (prefers coords, falls back to text) */
function stopMapsUrl(o) {
  const hasCoord = typeof o.lat === "number" && typeof o.lng === "number" && (o.lat || o.lng);
  const q = hasCoord ? `${o.lat},${o.lng}` : encodeURIComponent([o.name, o.address].filter(Boolean).join(", "));
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

/* ---- result (planner) -> flat records ---- */
function recordsFromResult(result) {
  const recs = [];
  result.days.forEach((day, di) => {
    day.stops.forEach((s, si) => {
      recs.push({
        uid: `${di + 1}-${si + 1}-${(s.id || s.name || "").slice(0, 24)}`,
        day: di + 1,
        stop: si + 1,
        name: s.name || "",
        address: s.address || "",
        lat: typeof s.lat === "number" && s.lat ? s.lat : null,
        lng: typeof s.lng === "number" && s.lng ? s.lng : null,
        driveMin: s.driveFromPrev ? Math.round(s.driveFromPrev.seconds / 60) : 0,
        distance: s.driveFromPrev ? fmtDistance(s.driveFromPrev.meters, result.units) : "",
        status: "", priority: "", contactName: "", contactRole: "",
        phone: "", email: "", apptDate: "", apptTime: "",
        materials: "", followUp: "", notes: "",
      });
    });
  });
  return recs;
}

function recordToRow(r) {
  return {
    "Day": r.day, "Stop": r.stop, "School / Site Name": r.name, "Address": r.address,
    "Latitude": r.lat == null ? "" : r.lat, "Longitude": r.lng == null ? "" : r.lng,
    "Maps Link": "", // hyperlink set after sheet build
    "Drive From Prev (min)": r.driveMin === "" ? "" : r.driveMin, "Distance From Prev": r.distance,
    "Status": r.status, "Priority": r.priority, "Contact Name": r.contactName,
    "Title / Role": r.contactRole, "Phone": r.phone, "Email": r.email,
    "Appointment Date": r.apptDate, "Appointment Time": r.apptTime,
    "Materials Shared": r.materials, "Follow-up Date": r.followUp, "Notes": r.notes,
  };
}

/* ---- build + save workbook from records + meta ---- */
function saveTrackerWorkbook(records, meta) {
  const rows = records.map(recordToRow);
  const ws = XLSX.utils.json_to_sheet(rows, { header: TRACK_COLS });
  ws["!cols"] = TRACK_COL_WIDTHS;
  ws["!autofilter"] = {
    ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rows.length, c: TRACK_COLS.length - 1 } }),
  };
  ws["!freeze"] = { xSplit: 0, ySplit: 1, topLeftCell: "A2", activePane: "bottomLeft", state: "frozen" };

  // hyperlink the Maps Link column
  const mapCol = TRACK_COLS.indexOf("Maps Link");
  records.forEach((r, i) => {
    const url = stopMapsUrl(r);
    const ref = XLSX.utils.encode_cell({ r: i + 1, c: mapCol });
    ws[ref] = { t: "s", v: "Open in Maps", l: { Target: url, Tooltip: "Open in Google Maps" } };
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, TRACKER_SHEET);

  // ---- Summary sheet ----
  const totalSeconds = meta.totalSeconds || 0;
  const gen = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const aoa = [
    ["Rihla — Outreach Tracker"],
    [],
    ["Start location", meta.city || ""],
    ["Generated", gen],
    ["Total days", meta.days || ""],
    ["Total sites", records.length],
    ["Total drive", totalSeconds ? fmtDuration(totalSeconds) : ""],
    [],
    ["Day routes", "(click to open the full driving route in Google Maps)"],
  ];
  const linkRows = [];
  (meta.dayLinks || []).forEach((url, i) => {
    aoa.push([`Day ${i + 1}`, "Open route"]);
    if (url) linkRows.push({ r: aoa.length - 1, url });
  });
  aoa.push([]);
  aoa.push(["Status values", STATUS_OPTIONS.join("  ·  ")]);
  aoa.push(["How to use", "Open the Outreach Tracker sheet, or load this file into Rihla's Organizer to edit visually."]);

  const sws = XLSX.utils.aoa_to_sheet(aoa);
  sws["!cols"] = [{ wch: 16 }, { wch: 64 }];
  linkRows.forEach(({ r, url }) => {
    const ref = XLSX.utils.encode_cell({ r, c: 1 });
    sws[ref] = { t: "s", v: "Open route", l: { Target: url, Tooltip: "Open route in Google Maps" } };
  });
  XLSX.utils.book_append_sheet(wb, sws, SUMMARY_SHEET);

  const cityPart = (meta.city || "outreach").split(",")[0].trim().replace(/\s+/g, "-").toLowerCase();
  XLSX.writeFile(wb, `rihla-outreach-${cityPart}.xlsx`);
}

/* ---- planner result -> download ---- */
function exportTrackerFromResult(result) {
  const start = result.center ? { lat: result.center.lat, lng: result.center.lng, name: result.city } : null;
  const dayLinks = result.days.map((d) => (typeof gmapsDayLink === "function" ? gmapsDayLink(d, start) : null));
  const totalSeconds = result.days.reduce((a, d) => a + d.totalSeconds, 0);
  saveTrackerWorkbook(recordsFromResult(result), {
    city: result.city, days: result.days.length, totalSeconds, dayLinks,
  });
}

/* ---- organizer records -> download (re-export with tracking filled) ---- */
function exportTrackerFromRecords(records, meta) {
  saveTrackerWorkbook(records, meta || {});
}

/* ---- parse an uploaded .xlsx back into records ---- */
async function parseTrackerFile(file) {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });

  // find the tracker sheet (by name, else first sheet with a name-like header)
  let sheet = wb.Sheets[TRACKER_SHEET];
  if (!sheet) {
    for (const nm of wb.SheetNames) {
      const head = XLSX.utils.sheet_to_json(wb.Sheets[nm], { header: 1 })[0] || [];
      if (head.some((h) => /school|site name|^name$/i.test(String(h).trim()))) { sheet = wb.Sheets[nm]; break; }
    }
  }
  if (!sheet) {
    throw new Error("This file doesn't look like a Rihla itinerary. Upload the Excel you downloaded from the Planner.");
  }

  const aoa = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
  const headers = (aoa[0] || []).map((h) => String(h).trim());
  const col = (...names) => {
    for (const n of names) {
      const i = headers.findIndex((h) => h.toLowerCase() === n.toLowerCase());
      if (i >= 0) return i;
    }
    for (const n of names) {
      const i = headers.findIndex((h) => h.toLowerCase().includes(n.toLowerCase()));
      if (i >= 0) return i;
    }
    return -1;
  };

  const M = {
    day: col("Day"), stop: col("Stop"), name: col("School / Site Name", "Name"),
    address: col("Address"), lat: col("Latitude", "Lat"), lng: col("Longitude", "Lng", "Long"),
    driveMin: col("Drive From Prev (min)", "Drive"), distance: col("Distance From Prev", "Distance"),
    status: col("Status"), priority: col("Priority"),
    contactName: col("Contact Name"), contactRole: col("Title / Role", "Role", "Title"),
    phone: col("Phone"), email: col("Email"),
    apptDate: col("Appointment Date"), apptTime: col("Appointment Time"),
    materials: col("Materials Shared", "Materials"), followUp: col("Follow-up Date", "Follow up", "Followup"),
    notes: col("Notes"),
  };
  if (M.name < 0) throw new Error("Couldn't find a school-name column in this file.");

  const g = (row, i) => (i >= 0 && row[i] != null ? row[i] : "");
  const records = [];
  for (let r = 1; r < aoa.length; r++) {
    const row = aoa[r] || [];
    const name = String(g(row, M.name)).trim();
    if (!name) continue;
    const latN = parseFloat(g(row, M.lat));
    const lngN = parseFloat(g(row, M.lng));
    records.push({
      uid: `r${r}-${g(row, M.day)}-${g(row, M.stop)}-${name.slice(0, 16)}`,
      day: Number(g(row, M.day)) || "",
      stop: Number(g(row, M.stop)) || "",
      name,
      address: String(g(row, M.address) || "").trim(),
      lat: Number.isFinite(latN) ? latN : null,
      lng: Number.isFinite(lngN) ? lngN : null,
      driveMin: g(row, M.driveMin),
      distance: String(g(row, M.distance) || ""),
      status: String(g(row, M.status) || "").trim(),
      priority: String(g(row, M.priority) || "").trim(),
      contactName: String(g(row, M.contactName) || ""),
      contactRole: String(g(row, M.contactRole) || ""),
      phone: String(g(row, M.phone) || ""),
      email: String(g(row, M.email) || ""),
      apptDate: String(g(row, M.apptDate) || ""),
      apptTime: String(g(row, M.apptTime) || ""),
      materials: String(g(row, M.materials) || ""),
      followUp: String(g(row, M.followUp) || ""),
      notes: String(g(row, M.notes) || ""),
    });
  }

  // meta from Summary sheet, if present
  const meta = { days: new Set(records.map((r) => r.day).filter(Boolean)).size };
  const sum = wb.Sheets[SUMMARY_SHEET];
  if (sum) {
    const sa = XLSX.utils.sheet_to_json(sum, { header: 1, defval: "" });
    sa.forEach((row) => {
      const k = String(row[0] || "").toLowerCase();
      if (k.includes("start location")) meta.city = String(row[1] || "");
      if (k.includes("generated")) meta.generated = String(row[1] || "");
    });
  }
  return { records, meta };
}

Object.assign(window, {
  STATUS_OPTIONS,
  recordsFromResult,
  exportTrackerFromResult,
  exportTrackerFromRecords,
  parseTrackerFile,
  stopMapsUrl,
});
