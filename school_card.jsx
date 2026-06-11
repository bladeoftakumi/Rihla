/* school_card.jsx — one expandable, editable school record in the Organizer */
const { useState: useSCState } = React;

const STATUS_META = {
  "Not Started":    { color: "var(--ink-3)",  dot: "#687579" },
  "Contacted":      { color: "#6aa6e0",        dot: "#6aa6e0" },
  "Meeting Booked": { color: "#d8a24a",        dot: "#d8a24a" },
  "Visited":        { color: "#a08ae8",        dot: "#a08ae8" },
  "Confirmed":      { color: "var(--accent-ink)", dot: "#2dd4bf" },
  "Declined":       { color: "#f0726a",        dot: "#f0726a" },
};
function statusOf(s) { return STATUS_META[s] ? s : "Not Started"; }

function OField({ label, icon, children, full }) {
  return (
    <div className={"o-field" + (full ? " o-field-full" : "")}>
      <label className="o-flabel">{icon}{label}</label>
      {children}
    </div>
  );
}

function SchoolCard({ rec }) {
  const [open, setOpen] = useSCState(false);
  const st = statusOf(rec.status);
  const meta = STATUS_META[st];
  const set = (k) => (e) => rec.onChange(rec.uid, { [k]: e.target.value });

  const mapsUrl = stopMapsUrl(rec);
  const hasContact = rec.contactName || rec.phone || rec.email;
  const hasAppt = rec.apptDate || rec.apptTime;

  return (
    <div className={"school-card" + (open ? " open" : "")}>
      <button className="sc-head" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="sc-dot" style={{ background: meta.dot }} />
        <span className="sc-head-main">
          <span className="sc-name">{rec.name}</span>
          {rec.address && <span className="sc-addr">{rec.address}</span>}
          {(hasContact || hasAppt) && !open && (
            <span className="sc-tags">
              {rec.contactName && <span className="sc-tag"><IconUser size={11} />{rec.contactName}</span>}
              {rec.phone && <span className="sc-tag"><IconPhone size={11} />{rec.phone}</span>}
              {hasAppt && <span className="sc-tag sc-tag-appt"><IconCalendar size={11} />{[rec.apptDate, rec.apptTime].filter(Boolean).join(" · ")}</span>}
            </span>
          )}
        </span>
        <span className="sc-head-right">
          {rec.day && <span className="sc-daybadge">Day {rec.day}{rec.stop ? ` · ${rec.stop}` : ""}</span>}
          <span className="sc-status-pill" style={{ color: meta.color, borderColor: meta.color }}>{st}</span>
          <span className={"sc-chev" + (open ? " up" : "")}><IconChevron size={16} /></span>
        </span>
      </button>

      {open && (
        <div className="sc-body">
          <div className="o-grid">
            <OField label="Status" icon={<IconCircleCheck size={13} />}>
              <select className="input" value={st} onChange={set("status")}>
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </OField>
            <OField label="Priority" icon={<IconSparkle size={13} />}>
              <select className="input" value={rec.priority || ""} onChange={set("priority")}>
                <option value="">—</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </OField>

            <OField label="Contact name" icon={<IconUser size={13} />}>
              <input className="input" value={rec.contactName} onChange={set("contactName")} placeholder="e.g. Principal Yusuf" />
            </OField>
            <OField label="Title / role" icon={<IconBriefcase size={13} />}>
              <input className="input" value={rec.contactRole} onChange={set("contactRole")} placeholder="e.g. Administrator" />
            </OField>

            <OField label="Phone" icon={<IconPhone size={13} />}>
              <input className="input" value={rec.phone} onChange={set("phone")} placeholder="(000) 000-0000" />
            </OField>
            <OField label="Email" icon={<IconMail size={13} />}>
              <input className="input" type="email" value={rec.email} onChange={set("email")} placeholder="name@school.org" />
            </OField>

            <OField label="Appointment date" icon={<IconCalendar size={13} />}>
              <input className="input" type="date" value={rec.apptDate} onChange={set("apptDate")} />
            </OField>
            <OField label="Appointment time" icon={<IconClock size={13} />}>
              <input className="input" type="time" value={rec.apptTime} onChange={set("apptTime")} />
            </OField>

            <OField label="Materials shared" icon={<IconClipboard size={13} />} full>
              <input className="input" value={rec.materials} onChange={set("materials")} placeholder="Brochures, flyers, sign-up form…" />
            </OField>
            <OField label="Follow-up date" icon={<IconRefresh size={13} />}>
              <input className="input" type="date" value={rec.followUp} onChange={set("followUp")} />
            </OField>
            <OField label="Open location" icon={<IconPin size={13} />}>
              <a className="o-maplink" href={mapsUrl} target="_blank" rel="noopener noreferrer">
                Google Maps <IconExternal size={12} />
              </a>
            </OField>

            <OField label="Notes" icon={<IconEdit size={13} />} full>
              <textarea className="input o-textarea" value={rec.notes} onChange={set("notes")} rows={3}
                placeholder="Visit notes, next steps, things to remember…" />
            </OField>
          </div>

          <div className="sc-quick">
            {rec.phone && <a className="sc-quick-btn" href={`tel:${rec.phone.replace(/[^0-9+]/g, "")}`}><IconPhone size={13} /> Call</a>}
            {rec.email && <a className="sc-quick-btn" href={`mailto:${rec.email}`}><IconMail size={13} /> Email</a>}
            <a className="sc-quick-btn" href={mapsUrl} target="_blank" rel="noopener noreferrer"><IconPin size={13} /> Directions</a>
          </div>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { SchoolCard, STATUS_META, statusOf });
