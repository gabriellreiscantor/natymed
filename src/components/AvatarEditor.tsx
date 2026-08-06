import { useEffect, useRef, useState } from "react";
import { RotateCw, ZoomIn, ZoomOut, X, Check } from "lucide-react";

type Props = {
  file: File;
  onCancel: () => void;
  onSave: (blob: Blob) => void | Promise<void>;
  outputSize?: number; // final square px
};

const BOX = 288; // preview box px

export function AvatarEditor({ file, onCancel, onSave, outputSize = 512 }: Props) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rot, setRot] = useState(0); // 0 | 90 | 180 | 270
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const areaRef = useRef<HTMLDivElement>(null);

  // Load image
  useEffect(() => {
    const url = URL.createObjectURL(file);
    const i = new Image();
    i.onload = () => setImg(i);
    i.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Effective (rotated) dimensions
  const rotated = rot % 180 !== 0;
  const iw = img ? (rotated ? img.height : img.width) : 1;
  const ih = img ? (rotated ? img.width : img.height) : 1;
  const baseScale = BOX / Math.min(iw, ih); // cover the circle at zoom=1
  const dispW = iw * baseScale * zoom;
  const dispH = ih * baseScale * zoom;

  // Clamp position so image always covers the circle
  const clamp = (p: { x: number; y: number }) => {
    const mx = Math.max(0, (dispW - BOX) / 2);
    const my = Math.max(0, (dispH - BOX) / 2);
    return {
      x: Math.min(mx, Math.max(-mx, p.x)),
      y: Math.min(my, Math.max(-my, p.y)),
    };
  };

  useEffect(() => {
    setPos((p) => clamp(p));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom, rot, img]);

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, ox: pos.x, oy: pos.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    setPos(clamp({ x: d.ox + (e.clientX - d.x), y: d.oy + (e.clientY - d.y) }));
  };
  const onPointerUp = () => {
    dragRef.current = null;
  };
  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const next = Math.min(4, Math.max(1, zoom - e.deltaY * 0.002));
    setZoom(next);
  };

  const salvar = async () => {
    if (!img) return;
    setSaving(true);
    try {
      const out = document.createElement("canvas");
      out.width = outputSize;
      out.height = outputSize;
      const ctx = out.getContext("2d")!;
      const k = outputSize / BOX;
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, outputSize, outputSize);
      ctx.save();
      ctx.translate(outputSize / 2 + pos.x * k, outputSize / 2 + pos.y * k);
      ctx.rotate((rot * Math.PI) / 180);
      const drawW = img.width * baseScale * zoom * k;
      const drawH = img.height * baseScale * zoom * k;
      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();
      const blob: Blob = await new Promise((res, rej) =>
        out.toBlob((b) => (b ? res(b) : rej(new Error("toBlob"))), "image/jpeg", 0.9),
      );
      await onSave(blob);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: "rgba(157, 23, 77, 0.35)", backdropFilter: "blur(6px)" }}>
      <div className="w-full max-w-sm rounded-3xl border border-pink-100 bg-white p-5 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-serif text-lg text-pink-700">Ajustar foto</h3>
          <button onClick={onCancel} className="grid h-8 w-8 place-items-center rounded-full text-pink-400 hover:bg-pink-50">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div
          ref={areaRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onWheel={onWheel}
          className="relative mx-auto touch-none select-none overflow-hidden rounded-full bg-pink-50 ring-4 ring-pink-200"
          style={{ width: BOX, height: BOX, maxWidth: "100%", cursor: dragRef.current ? "grabbing" : "grab" }}
        >
          {img && (
            <img
              src={img.src}
              alt=""
              draggable={false}
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                width: img.width * baseScale * zoom,
                height: img.height * baseScale * zoom,
                transform: `translate(-50%, -50%) translate(${pos.x}px, ${pos.y}px) rotate(${rot}deg)`,
                transformOrigin: "center",
                maxWidth: "none",
                pointerEvents: "none",
              }}
            />
          )}
          {/* subtle grid overlay */}
          <div className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-inset ring-white/40" />
        </div>

        <div className="mt-4 flex items-center gap-3">
          <ZoomOut className="h-4 w-4 shrink-0 text-pink-400" />
          <input
            type="range"
            min={1}
            max={4}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-pink-100 accent-pink-500"
          />
          <ZoomIn className="h-4 w-4 shrink-0 text-pink-500" />
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setRot((r) => (r + 90) % 360)}
            className="inline-flex items-center gap-1.5 rounded-full border border-pink-200 bg-white px-3 py-1.5 text-xs text-pink-700 hover:bg-pink-50"
          >
            <RotateCw className="h-3.5 w-3.5" />
            Girar
          </button>
          <span className="text-[11px] text-pink-400">Arraste para posicionar</span>
        </div>

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-full border border-pink-200 px-4 py-2.5 text-sm text-pink-600 hover:bg-pink-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={salvar}
            disabled={!img || saving}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full bg-pink-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-pink-600 disabled:opacity-50"
          >
            <Check className="h-4 w-4" />
            {saving ? "Enviando..." : "Usar foto"}
          </button>
        </div>
      </div>
    </div>
  );
}
