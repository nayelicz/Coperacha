"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export default function QrCoDi({ valor, tam = 220 }: { valor: string; tam?: number }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    QRCode.toDataURL(valor, { width: tam * 2, margin: 1, color: { dark: "#1F1B16", light: "#FFFFFF" } })
      .then(setSrc)
      .catch(() => setSrc(""));
  }, [valor, tam]);
  if (!src) return <div style={{ width: tam, height: tam }} className="animate-pulse rounded-xl bg-[#F3EEE7]" />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} width={tam} height={tam} alt="Código QR de CoDi" className="rounded-xl border border-[#EDE6DC]" />;
}
