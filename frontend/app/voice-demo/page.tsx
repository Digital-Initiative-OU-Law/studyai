import VoiceOrb from "@/components/VoiceOrb";

export default function Page() {
  return (
    <main style={{ maxWidth: 960, margin: '0 auto', padding: '48px 24px' }}>
      <h1 style={{ fontSize: 28, fontWeight: 600, marginBottom: 8 }}>Advanced Voice — Demo</h1>
      <p style={{ opacity: 0.7, marginBottom: 24 }}>
        A modern orb that throbs with your voice input. This will be wired to ElevenLabs realtime.
      </p>
      <VoiceOrb />
    </main>
  );
}

