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
const IconArrowRight=(p) => <Icon {...p} d={["M5 12h14","M13 6l6 6-6 6"]} />;
const IconLock     = (p) => <Icon {...p} d={["M6 11h12a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1Z","M8 11V8a4 4 0 0 1 8 0v3"]} />;
const IconMail     = (p) => <Icon {...p} d={["M4 6h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Z","M4.5 7l7.5 6 7.5-6"]} />;
const IconSparkle  = (p) => <Icon {...p} d={["M12 4l1.6 4.8L18 10l-4.4 1.2L12 16l-1.6-4.8L6 10l4.4-1.2L12 4Z"]} />;
const IconUpload   = (p) => <Icon {...p} d={["M12 15V4","M8 8l4-4 4 4","M5 16v3a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3"]} />;
const IconTable    = (p) => <Icon {...p} d={["M4 5h16v14H4z","M4 10h16","M4 15h16","M10 5v14"]} />;
const IconPhone    = (p) => <Icon {...p} d={["M5 4h3l1.6 5-2 1.2a11 11 0 0 0 5.2 5.2l1.2-2 5 1.6v3a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1Z"]} />;
const IconCalendar = (p) => <Icon {...p} d={["M4 6h16v14H4z","M4 10h16","M8 4v4","M16 4v4"]} />;
const IconUser     = (p) => <Icon {...p} d={["M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z","M5 20a7 7 0 0 1 14 0"]} />;
const IconSearch   = (p) => <Icon {...p} d={["M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Z","M20 20l-3.5-3.5"]} />;
const IconChevron  = (p) => <Icon {...p} d="M6 9l6 6 6-6" />;
const IconClipboard= (p) => <Icon {...p} d={["M9 5h6v2H9z","M8 6H6a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1h-2"]} />;
const IconTrash    = (p) => <Icon {...p} d={["M5 7h14","M9 7V5h6v2","M7 7l1 12a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-12"]} />;
const IconBriefcase= (p) => <Icon {...p} d={["M4 8h16v11H4z","M9 8V6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2","M4 13h16"]} />;
const IconRefresh  = (p) => <Icon {...p} d={["M19 12a7 7 0 1 1-2-5","M17 3v4h-4"]} />;
const IconEdit     = (p) => <Icon {...p} d={["M4 20h4L18 10l-4-4L4 16v4Z","M13 7l4 4"]} />;
const IconPlus     = (p) => <Icon {...p} d={["M12 5v14","M5 12h14"]} />;
const IconCircleCheck = (p) => <Icon {...p} d={["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z","M8.5 12l2.5 2.5 4.5-5"]} />;

Object.assign(window, {
  Icon, BrandMark, IconRoute, IconCar, IconDownload, IconClock, IconPin,
  IconWarn, IconInfo, IconCheck, IconExternal, IconArrowLeft, IconLock, IconMail, IconSparkle,
  IconUpload, IconTable, IconPhone, IconCalendar, IconUser, IconSearch, IconChevron,
  IconClipboard, IconTrash, IconBriefcase, IconRefresh, IconEdit, IconPlus, IconCircleCheck,
  IconArrowRight,
});
