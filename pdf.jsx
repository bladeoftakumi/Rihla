/* pdf.jsx — branded itinerary PDF via jsPDF */

function generatePDF(result, meta) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "pt", format: "letter" }); // 612 x 792 pt
  const PW = doc.internal.pageSize.getWidth();
  const PH = doc.internal.pageSize.getHeight();
  const M = 48;                 // page margin
  const teal = [15, 118, 110];
  const tealInk = [10, 86, 79];
  const ink = [20, 24, 27];
  const ink2 = [74, 84, 92];
  const ink3 = [139, 149, 156];
  const line = [228, 231, 233];
  const soft = [231, 242, 240];

  let y = 0;

  const setFill = (c) => doc.setFillColor(c[0], c[1], c[2]);
  const setText = (c) => doc.setTextColor(c[0], c[1], c[2]);
  const setDraw = (c) => doc.setDrawColor(c[0], c[1], c[2]);

  /* ---------- header band ---------- */
  function header() {
    setFill(teal);
    doc.rect(0, 0, PW, 96, "F");
    // brand mark — two circles + dashed line (simple shapes)
    doc.setDrawColor(255, 255, 255); doc.setLineWidth(1.6);
    doc.circle(M + 7, 44, 5, "S");
    doc.circle(M + 27, 30, 5, "S");
    doc.setLineDashPattern([1, 2.4], 0);
    doc.line(M + 11.5, 40.5, M + 22.5, 33.5);
    doc.setLineDashPattern([], 0);
    // wordmark
    doc.setFont("helvetica", "bold"); doc.setFontSize(19); doc.setTextColor(255, 255, 255);
    doc.text("Rihla", M + 44, 40);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(206, 230, 226);
    doc.text("OUTREACH ROUTE PLANNER", M + 44, 53, { charSpace: 1.2 });
    // right meta
    doc.setFontSize(9); doc.setTextColor(220, 238, 235);
    const gen = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    doc.text(`Generated ${gen}`, PW - M, 40, { align: "right" });
    doc.text(meta.isSample ? "SAMPLE PREVIEW" : (result.city || ""), PW - M, 53, { align: "right" });
    y = 130;
  }

  /* ---------- title + summary ---------- */
  function summary() {
    setText(ink); doc.setFont("helvetica", "bold"); doc.setFontSize(22);
    doc.text("Outreach Itinerary", M, y);
    y += 18;
    setText(ink2); doc.setFont("helvetica", "normal"); doc.setFontSize(10.5);
    const dep = result.departure
      ? new Date(result.departure).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
      : "—";
    doc.text(`${result.city || ""}  ·  departs ${dep} each day`, M, y);
    y += 26;

    // stat row
    const totalSeconds = result.days.reduce((a, d) => a + d.totalSeconds, 0);
    const totalStops = result.days.reduce((a, d) => a + d.stops.length, 0);
    const stats = [
      [String(result.days.length), "DAYS"],
      [String(totalStops), "SITES"],
      [fmtDuration(totalSeconds), "TOTAL DRIVE"],
    ];
    const boxW = (PW - 2 * M - 2 * 12) / 3;
    stats.forEach((s, i) => {
      const x = M + i * (boxW + 12);
      setFill([250, 251, 251]); setDraw(line); doc.setLineWidth(0.8);
      doc.roundedRect(x, y, boxW, 52, 6, 6, "FD");
      setText(ink); doc.setFont("helvetica", "bold"); doc.setFontSize(17);
      doc.text(s[0], x + 14, y + 26);
      setText(ink3); doc.setFont("helvetica", "normal"); doc.setFontSize(7.5);
      doc.text(s[1], x + 14, y + 41, { charSpace: 0.8 });
    });
    y += 52 + 30;
  }

  function ensureSpace(needed) {
    if (y + needed > PH - 56) {
      footer();
      doc.addPage();
      y = M + 8;
    }
  }

  /* ---------- day block ---------- */
  function dayBlock(day, idx) {
    ensureSpace(70);
    // day header
    const badgeW = 62;
    setFill(soft); doc.roundedRect(M, y - 12, badgeW, 20, 4, 4, "F");
    setText(tealInk); doc.setFont("helvetica", "bold"); doc.setFontSize(9);
    doc.text(`DAY ${idx + 1}`, M + 10, y + 2, { charSpace: 0.6 });
    setText(ink2); doc.setFont("helvetica", "normal"); doc.setFontSize(9.5);
    const meta = `${day.stops.length} sites · ${fmtDuration(day.totalSeconds)} drive · ${fmtDistance(day.totalMeters, result.units)}`;
    doc.text(meta, PW - M, y + 2, { align: "right" });
    y += 22;
    setDraw(line); doc.setLineWidth(0.8);
    doc.line(M, y, PW - M, y);
    y += 18;

    day.stops.forEach((stop, sIdx) => {
      // drive-from-previous row
      if (stop.driveFromPrev) {
        ensureSpace(20);
        // teal connector line in place of an arrow glyph (avoids non-Latin-1 chars)
        setDraw(teal); doc.setLineWidth(1.3);
        doc.line(M + 9, y - 9, M + 9, y - 1);
        setText(ink3); doc.setFont("helvetica", "normal"); doc.setFontSize(8.5);
        const drv = `${fmtDuration(stop.driveFromPrev.seconds)} drive  ${fmtDistance(stop.driveFromPrev.meters, result.units)}`;
        doc.text(drv, M + 24, y);
        y += 16;
      }
      // measure name + address wrap
      const textX = M + 30, textW = PW - M - textX;
      doc.setFont("helvetica", "bold"); doc.setFontSize(11.5);
      const nameLines = doc.splitTextToSize(stop.name, textW);
      doc.setFont("helvetica", "normal"); doc.setFontSize(9.5);
      const addrLines = doc.splitTextToSize(stop.address || "", textW);
      const blockH = nameLines.length * 14 + addrLines.length * 12 + 6;
      ensureSpace(blockH + 6);

      // number bullet
      setDraw(teal); doc.setLineWidth(1.3); setFill([255, 255, 255]);
      doc.circle(M + 9, y + 2, 9, "FD");
      setText(tealInk); doc.setFont("helvetica", "bold"); doc.setFontSize(9);
      doc.text(String(sIdx + 1), M + 9, y + 5, { align: "center" });

      // name
      setText(ink); doc.setFont("helvetica", "bold"); doc.setFontSize(11.5);
      doc.text(nameLines, textX, y + 4);
      let yy = y + 4 + nameLines.length * 13;
      // address
      setText(ink2); doc.setFont("helvetica", "normal"); doc.setFontSize(9.5);
      doc.text(addrLines, textX, yy + 2);
      yy += addrLines.length * 12;

      y = yy + 16;
    });
    y += 12;
  }

  /* ---------- footer ---------- */
  function footer() {
    const fy = PH - 30;
    setDraw(line); doc.setLineWidth(0.8);
    doc.line(M, fy - 10, PW - M, fy - 10);
    setText(ink3); doc.setFont("helvetica", "normal"); doc.setFontSize(8);
    doc.text("Generated with Rihla · Drive times are traffic-aware estimates from Google Maps and may vary.", M, fy);
    const pg = `${doc.internal.getCurrentPageInfo().pageNumber}`;
    doc.text(pg, PW - M, fy, { align: "right" });
  }

  header();
  summary();
  result.days.forEach((d, i) => dayBlock(d, i));
  footer();

  const city = (result.city || "outreach").split(",")[0].trim().replace(/\s+/g, "-").toLowerCase();
  doc.save(`rihla-itinerary-${city}.pdf`);
}

Object.assign(window, { generatePDF });
