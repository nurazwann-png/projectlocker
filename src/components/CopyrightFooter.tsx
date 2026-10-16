const year = new Date().getFullYear();

export default function CopyrightFooter({ dark = false }: { dark?: boolean }) {
  const text = dark ? "rgba(200,190,255,0.35)" : "#b8b5d4";
  const border = dark ? "rgba(255,255,255,0.07)" : "#ede9fe";

  return (
    <footer
      className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-6 py-4 text-center"
      style={{ borderTop: `1px solid ${border}` }}
    >
      <span style={{ fontSize: "0.72rem", color: text, fontFamily: "'Syne', system-ui, sans-serif", fontWeight: 600, letterSpacing: "0.03em" }}>
        © {year} Nurazwann bin Ismail
      </span>
      <span style={{ color: border }}>·</span>
      <span style={{ fontSize: "0.72rem", color: text, fontFamily: "'Syne', system-ui, sans-serif", fontWeight: 600, letterSpacing: "0.03em" }}>
        Pejabat Pendidikan Daerah Dalat
      </span>
      <span style={{ color: border }}>·</span>
      <span style={{ fontSize: "0.72rem", color: text, fontWeight: 500, letterSpacing: "0.01em" }}>
        All rights reserved
      </span>
    </footer>
  );
}
