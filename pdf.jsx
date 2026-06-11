/* pdf.jsx — branded itinerary PDF via jsPDF (dark slate-teal, matches the app) */

function generatePDF(result, meta) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "pt", format: "letter" }); // 612 x 792 pt
  const PW = doc.internal.pageSize.getWidth();
  const PH = doc.internal.pageSize.getHeight();
  const M = 48;                      // page margin
  const CONTENT_BOTTOM = PH - 54;    // keep clear of footer

  /* ---- dark palette (mirrors the app tokens) ---- */
  const bg        = [14, 20, 22];    // --bg
  const band      = [16, 23, 26];    // header band
  const surf      = [21, 28, 31];    // --surface (cards / stat boxes)
  const line      = [37, 48, 52];    // --line
  const ink       = [232, 237, 238]; // --ink
  const ink2      = [152, 165, 169]; // --ink-2
  const ink3      = [113, 126, 131]; // --ink-3
  const accent    = [45, 212, 191];  // --accent
  const accentInk = [102, 224, 208]; // --accent-ink
  const badgeBg   = [22, 41, 41];    // dark soft-teal
  const white     = [255, 255, 255];

  const setFill = (c) => doc.setFillColor(c[0], c[1], c[2]);
  const setText = (c) => doc.setTextColor(c[0], c[1], c[2]);
  const setDraw = (c) => doc.setDrawColor(c[0], c[1], c[2]);
  const paintBg = () => { setFill(bg); doc.rect(0, 0, PW, PH, "F"); };
  const newPage = () => { doc.addPage(); paintBg(); y = M + 8; };

  // day-box inner geometry
  const PAD = 18;
  const boxX = M;
  const boxW = PW - 2 * M;
  const railX = boxX + PAD + 9;          // bullet centre x
  const textX = boxX + PAD + 30;
  const textW = (boxX + boxW - PAD) - textX;

  // each day launches from the same start point (home/city) the user entered
  const start = result.center
    ? { lat: result.center.lat, lng: result.center.lng, name: result.city }
    : null;

  let y = 0;

  /* ---------- header band ---------- */
  function header() {
    setFill(band);
    doc.rect(0, 0, PW, 96, "F");
    setDraw(line); doc.setLineWidth(1);
    doc.line(0, 96, PW, 96);
    // brand mark — two teal pins + dashed orbit
    setDraw(accent); doc.setLineWidth(1.6);
    doc.circle(M + 7, 44, 5, "S");
    doc.circle(M + 27, 30, 5, "S");
    doc.setLineDashPattern([1, 2.4], 0);
    doc.line(M + 11.5, 40.5, M + 22.5, 33.5);
    doc.setLineDashPattern([], 0);
    // wordmark
    doc.setFont("helvetica", "bold"); doc.setFontSize(20); setText(accent);
    doc.text("Rihla", M + 44, 41);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); setText(ink3);
    doc.text("OUTREACH ROUTE PLANNER", M + 45, 54, { charSpace: 1.4 });
    // right meta
    doc.setFontSize(9); setText(ink3);
    const gen = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    doc.text(`Generated ${gen}`, PW - M, 40, { align: "right" });
    doc.text(meta.isSample ? "SAMPLE PREVIEW" : (result.city || ""), PW - M, 53, { align: "right" });
    y = 132;
  }

  /* ---------- title + summary ---------- */
  function summary() {
    setText(ink); doc.setFont("helvetica", "bold"); doc.setFontSize(22);
    doc.text("Outreach Itinerary", M, y);
    y += 19;
    setText(ink2); doc.setFont("helvetica", "normal"); doc.setFontSize(10.5);
    const dep = result.departure
      ? new Date(result.departure).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
      : "—";
    doc.text(`${result.city || ""}   ·   departs ${dep} each day`, M, y);
    y += 26;

    const totalSeconds = result.days.reduce((a, d) => a + d.totalSeconds, 0);
    const totalStops = result.days.reduce((a, d) => a + d.stops.length, 0);
    const stats = [
      [String(result.days.length), "DAYS"],
      [String(totalStops), "SITES"],
      [fmtDuration(totalSeconds), "TOTAL DRIVE"],
    ];
    const gap = 12;
    const sw = (PW - 2 * M - 2 * gap) / 3;
    stats.forEach((s, i) => {
      const x = M + i * (sw + gap);
      setFill(surf); setDraw(line); doc.setLineWidth(0.9);
      doc.roundedRect(x, y, sw, 54, 8, 8, "FD");
      setText(ink); doc.setFont("helvetica", "bold"); doc.setFontSize(18);
      doc.text(s[0], x + 15, y + 28);
      setText(ink3); doc.setFont("helvetica", "normal"); doc.setFontSize(7.5);
      doc.text(s[1], x + 15, y + 43, { charSpace: 0.9 });
    });
    y += 54 + 32;
  }

  /* ---------- footer ---------- */
  function footer() {
    const fy = PH - 30;
    setDraw(line); doc.setLineWidth(0.8);
    doc.line(M, fy - 11, PW - M, fy - 11);
    setText(ink3); doc.setFont("helvetica", "normal"); doc.setFontSize(8);
    doc.text("Generated with Rihla · Drive times are traffic-aware estimates from Google Maps and may vary.", M, fy);
    doc.text(String(doc.internal.getCurrentPageInfo().pageNumber), PW - M, fy, { align: "right" });
  }

  /* ---------- one day, wrapped in a rounded box (page-break aware) ---------- */
  const HEAD_H = 34;
  const STOP_GAP = 14;
  const BOX_PAD_TOP = 14;
  const BOX_PAD_BOT = 14;

  function dayBlock(day, idx) {
    // 1) measure into a flat item list
    const items = [{ type: "head", h: HEAD_H }];
    day.stops.forEach((stop, sIdx) => {
      if (stop.driveFromPrev) items.push({ type: "drive", h: 18, stop });
      doc.setFont("helvetica", "bold"); doc.setFontSize(11.5);
      const nameLines = doc.splitTextToSize(stop.name, textW);
      doc.setFont("helvetica", "normal"); doc.setFontSize(9.5);
      const addrLines = stop.address ? doc.splitTextToSize(stop.address, textW) : [];
      const bodyH = nameLines.length * 13 + (addrLines.length ? addrLines.length * 11 + 3 : 0);
      const h = Math.max(bodyH, 22) + STOP_GAP;
      items.push({ type: "stop", h, stop, sIdx, nameLines, addrLines });
    });
    const routeUrl = gmapsDayLink(day, start);
    if (routeUrl) items.push({ type: "maplink", h: 24, url: routeUrl });

    // 2) render in box segments, breaking across pages if needed
    y += 6;
    // keep the day header with its first stop — never orphan a header at a page foot
    const firstChunk = HEAD_H + (items[1] ? items[1].h : 0);
    if (y + BOX_PAD_TOP + firstChunk + BOX_PAD_BOT > CONTENT_BOTTOM) {
      footer(); newPage();
    }
    let i = 0;
    while (i < items.length) {
      const segTop = y;
      let segY = segTop + BOX_PAD_TOP;
      const draw = [];
      while (i < items.length) {
        const it = items[i];
        if (segY + it.h > CONTENT_BOTTOM - BOX_PAD_BOT && draw.length) break;
        it._y = segY; draw.push(it); segY += it.h; i++;
      }
      const segBottom = segY + BOX_PAD_BOT;

      // box behind content
      setFill(surf); setDraw(line); doc.setLineWidth(1);
      doc.roundedRect(boxX, segTop, boxW, segBottom - segTop, 10, 10, "FD");

      // content on top
      draw.forEach((it) => renderItem(it, day, idx));
      y = segBottom;

      if (i < items.length) { footer(); newPage(); }
    }
    y += 16;
  }

  function renderItem(it, day, idx) {
    if (it.type === "head") {
      // teal badge
      setFill(badgeBg); doc.roundedRect(boxX + PAD, it._y, 52, 18, 4, 4, "F");
      setText(accentInk); doc.setFont("helvetica", "bold"); doc.setFontSize(8.5);
      doc.text(`DAY ${idx + 1}`, boxX + PAD + 9, it._y + 12.5, { charSpace: 0.6 });
      // meta right
      setText(ink2); doc.setFont("helvetica", "normal"); doc.setFontSize(9);
      const meta = `${day.stops.length} sites  ·  ${fmtDuration(day.totalSeconds)} drive  ·  ${fmtDistance(day.totalMeters, result.units)}`;
      doc.text(meta, boxX + boxW - PAD, it._y + 12.5, { align: "right" });
      // divider
      setDraw(line); doc.setLineWidth(0.8);
      doc.line(boxX + PAD, it._y + 27, boxX + boxW - PAD, it._y + 27);
      return;
    }
    if (it.type === "drive") {
      setDraw(accent); doc.setLineWidth(1.4);
      doc.line(railX, it._y + 1, railX, it._y + 11);
      setText(ink3); doc.setFont("helvetica", "normal"); doc.setFontSize(8.5);
      const drv = `${fmtDuration(it.stop.driveFromPrev.seconds)} drive   ${fmtDistance(it.stop.driveFromPrev.meters, result.units)}`;
      doc.text(drv, textX, it._y + 9);
      return;
    }
    if (it.type === "maplink") {
      setDraw(line); doc.setLineWidth(0.6);
      doc.line(boxX + PAD, it._y - 4, boxX + boxW - PAD, it._y - 4);
      setText(accent); doc.setFont("helvetica", "normal"); doc.setFontSize(9.5);
      const label = "Open this day's route in Google Maps";
      doc.textWithLink(label, boxX + PAD, it._y + 11, { url: it.url });
      const w = doc.getTextWidth(label);
      setDraw(accent); doc.setLineWidth(0.6);
      doc.line(boxX + PAD, it._y + 13.5, boxX + PAD + w, it._y + 13.5);
      return;
    }
    // stop
    setDraw(accent); doc.setLineWidth(1.3); setFill(surf);
    doc.circle(railX, it._y + 9, 9, "FD");
    setText(accentInk); doc.setFont("helvetica", "bold"); doc.setFontSize(9.5);
    doc.text(String(it.sIdx + 1), railX, it._y + 12.5, { align: "center" });

    setText(ink); doc.setFont("helvetica", "bold"); doc.setFontSize(11.5);
    doc.text(it.nameLines, textX, it._y + 10);
    let yy = it._y + 10 + it.nameLines.length * 13;
    if (it.addrLines.length) {
      setText(ink2); doc.setFont("helvetica", "normal"); doc.setFontSize(9.5);
      doc.text(it.addrLines, textX, yy);
    }
  }

  paintBg();
  header();
  summary();
  result.days.forEach((d, i) => dayBlock(d, i));
  footer();

  const city = (result.city || "outreach").split(",")[0].trim().replace(/\s+/g, "-").toLowerCase();
  doc.save(`rihla-itinerary-${city}.pdf`);
}

Object.assign(window, { generatePDF });
