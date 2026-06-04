/* icons.jsx — minimal inline icon set (shared via window) */
const Icon = ({ d, size = 16, sw = 1.7, fill = "none", style, ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill}
    stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"
    style={style} {...rest}>
    {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
  </svg>
);

/* Brand mark: a route/orbit glyph — two pins on an orbit path (simple shapes only) */
const BrandMark = ({ size = 30 }) => (
  <span className="brand-mark" style={{ background: "var(--accent)", borderRadius: 8 }}>
    <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 24 24" fill="none"
      stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="17" r="2.4" />
      <circle cx="18" cy="7" r="2.4" />
      <path d="M7.6 15.3 16.4 8.7" strokeDasharray="0.1 3.2" />
    </svg>
  </span>
);

const IconRoute    = (p) => <Icon {...p} d={["M6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z","M18 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z","M8 17h6a3 3 0 0 0 3-3V9"]} />;
const IconCar      = (p) => <Icon {...p} d={["M5 13l1.5-4.5A2 2 0 0 1 8.4 7h7.2a2 2 0 0 1 1.9 1.5L19 13","M5 13h14v4a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-1H8v1a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-4Z","M7.5 16h.01","M16.5 16h.01"]} />;
const IconDownload = (p) => <Icon {...p} d={["M12 4v11","M8 11l4 4 4-4","M5 19h14"]} />;
const IconClock    = (p) => <Icon {...p} d={["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z","M12 8v4l2.5 1.5"]} />;
const IconPin      = (p) => <Icon {...p} d={["M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z","M12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"]} />;
const IconWarn     = (p) => <Icon {...p} d={["M12 3 2.5 20h19L12 3Z","M12 9v5","M12 17.5h.01"]} />;
const IconInfo     = (p) => <Icon {...p} d={["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z","M12 11v5","M12 7.5h.01"]} />;
const IconCheck    = (p) => <Icon {...p} d="M5 12.5 10 17.5 19 7" />;
const IconExternal = (p) => <Icon {...p} d={["M14 5h5v5","M19 5l-8 8","M19 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"]} />;
const IconArrowLeft= (p) => <Icon {...p} d={["M19 12H5","M11 18l-6-6 6-6"]} />;
const IconLock     = (p) => <Icon {...p} d={["M6 11h12a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1Z","M8 11V8a4 4 0 0 1 8 0v3"]} />;
const IconMail     = (p) => <Icon {...p} d={["M4 6h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Z","M4.5 7l7.5 6 7.5-6"]} />;
const IconSparkle  = (p) => <Icon {...p} d={["M12 4l1.6 4.8L18 10l-4.4 1.2L12 16l-1.6-4.8L6 10l4.4-1.2L12 4Z"]} />;

Object.assign(window, {
  Icon, BrandMark, IconRoute, IconCar, IconDownload, IconClock, IconPin,
  IconWarn, IconInfo, IconCheck, IconExternal, IconArrowLeft, IconLock, IconMail, IconSparkle,
});
