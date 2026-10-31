/** Plain, printable documents (call sheets, take reports) — always black on white. */
export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="print-doc min-h-dvh bg-white p-6 text-black sm:p-10" style={{ colorScheme: "light", fontFamily: "Helvetica, Arial, sans-serif", fontWeight: 400 }}>
      <style>{`
        .print-doc h1{font-size:22px;font-weight:700;margin:0}
        .print-doc h2{font-size:14px;font-weight:700;margin:18px 0 6px;text-transform:uppercase;letter-spacing:.06em;border-bottom:2px solid #000;padding-bottom:3px}
        .print-doc table{width:100%;border-collapse:collapse;font-size:12px}
        .print-doc th,.print-doc td{border:1px solid #999;padding:4px 6px;text-align:left;vertical-align:top}
        .print-doc th{background:#eee}
        .print-doc p,.print-doc li{font-size:12.5px;line-height:1.45}
        @media print{.no-print{display:none!important}.print-doc{padding:0}@page{size:A4;margin:14mm}}
      `}</style>
      {children}
    </div>
  );
}
