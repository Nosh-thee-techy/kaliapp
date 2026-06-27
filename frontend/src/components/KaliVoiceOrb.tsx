import { useEffect, useRef } from "react";

type Props = {
  active: boolean;
  size?: number;
};

type Particle = {
  bx: number;
  by: number;
  bz: number;
  phase: number;
};

export function KaliVoiceOrb({ active, size = 280 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    if (particlesRef.current.length === 0) {
      const count = 720;
      for (let i = 0; i < count; i++) {
        const u = Math.random();
        const v = Math.random();
        const theta = 2 * Math.PI * u;
        const phi = Math.acos(2 * v - 1);
        const r = 0.92 + Math.random() * 0.08;
        particlesRef.current.push({
          bx: r * Math.sin(phi) * Math.cos(theta),
          by: r * Math.sin(phi) * Math.sin(theta),
          bz: r * Math.cos(phi),
          phase: Math.random() * Math.PI * 2,
        });
      }
    }

    const cx = size / 2;
    const cy = size / 2;
    const radius = size * 0.36;

    function draw(t: number) {
      if (!ctx) return;
      ctx.clearRect(0, 0, size, size);

      const pulse = active ? 1 + Math.sin(t * 0.004) * 0.06 : 1 + Math.sin(t * 0.0015) * 0.02;
      const wave = active ? 0.14 : 0.06;

      for (const p of particlesRef.current) {
        const wobble =
          Math.sin(t * 0.003 + p.phase) * wave +
          Math.sin(t * 0.005 + p.by * 4) * wave * 0.5;
        const x = p.bx * (1 + wobble);
        const y = p.by * (1 + wobble);
        const z = p.bz * (1 + wobble * 0.5);

        const rot = t * (active ? 0.0008 : 0.00035);
        const rx = x * Math.cos(rot) - z * Math.sin(rot);
        const rz = x * Math.sin(rot) + z * Math.cos(rot);

        const depth = (rz + 1.2) / 2.2;
        const px = cx + rx * radius * pulse;
        const py = cy + y * radius * pulse;
        const alpha = 0.25 + depth * 0.75;
        const dot = 0.8 + depth * 1.6;

        const g = ctx.createRadialGradient(px, py, 0, px, py, dot * 2);
        g.addColorStop(0, `rgba(120, 180, 255, ${alpha})`);
        g.addColorStop(0.5, `rgba(70, 120, 255, ${alpha * 0.7})`);
        g.addColorStop(1, "rgba(70, 120, 255, 0)");

        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(px, py, dot, 0, Math.PI * 2);
        ctx.fill();
      }

      frameRef.current = requestAnimationFrame(draw);
    }

    frameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frameRef.current);
  }, [active, size]);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <div
        className="pointer-events-none absolute inset-0 rounded-full blur-3xl transition-opacity duration-500"
        style={{
          background: active
            ? "radial-gradient(circle, rgba(43,89,255,0.45) 0%, transparent 70%)"
            : "radial-gradient(circle, rgba(43,89,255,0.2) 0%, transparent 70%)",
          opacity: active ? 1 : 0.6,
        }}
      />
      <canvas ref={canvasRef} className="relative z-10" aria-hidden />
      <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
        <div
          className={`flex h-14 w-14 items-center justify-center rounded-full border transition-all duration-300 ${
            active
              ? "border-blue-400/60 bg-blue-500/20 shadow-[0_0_32px_rgba(59,130,246,0.5)]"
              : "border-white/20 bg-white/5"
          }`}
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6 text-white/90" fill="currentColor" aria-hidden>
            <path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3Zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.71V21h2v-3.29A7 7 0 0 0 19 11h-2Z" />
          </svg>
        </div>
      </div>
    </div>
  );
}
