"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  size?: number;
  color?: string;
};

export default function VoiceOrb({ size = 240, color = "#841617" }: Props) {
  const [level, setLevel] = useState(0);
  const rafRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let audioCtx: AudioContext | null = null;

    const setup = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser);
        analyserRef.current = analyser;

        const data = new Uint8Array(analyser.frequencyBinCount);
        const tick = () => {
          analyser.getByteTimeDomainData(data);
          // Compute RMS
          let sum = 0;
          for (let i = 0; i < data.length; i++) {
            const v = (data[i] - 128) / 128; // -1..1
            sum += v * v;
          }
          const rms = Math.sqrt(sum / data.length); // 0..~1
          setLevel(rms);
          rafRef.current = requestAnimationFrame(tick);
        };
        tick();
      } catch (e) {
        console.warn("Mic not available, fallback to idle anim", e);
        // Fallback idle animation
        let t = 0;
        const tick = () => {
          t += 0.03;
          setLevel((Math.sin(t) + 1) / 16); // subtle pulse
          rafRef.current = requestAnimationFrame(tick);
        };
        tick();
      }
    };

    setup();
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (analyserRef.current) analyserRef.current.disconnect();
      if (stream) stream.getTracks().forEach((t) => t.stop());
      if (audioCtx) audioCtx.close();
    };
  }, []);

  const scale = useMemo(() => 1 + Math.min(0.35, level * 1.8), [level]);
  const glow = useMemo(() => 0.4 + Math.min(0.6, level * 2), [level]);

  return (
    <div style={{ display: 'grid', placeItems: 'center', width: '100%', minHeight: '60vh' }}>
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: `radial-gradient(60% 60% at 50% 40%, ${color}AA, ${color} 60%, #000)`,
          boxShadow: `0 0 ${Math.round(80 * glow)}px ${color}88`,
          transform: `scale(${scale})`,
          transition: 'transform 80ms linear',
          willChange: 'transform, box-shadow'
        }}
      />
      <div style={{ marginTop: 24, opacity: 0.7, fontSize: 14 }}>Listening…</div>
    </div>
  );
}

