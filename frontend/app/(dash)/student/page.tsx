import BackButton from "@/components/BackButton";

export default function StudentPage() {
  return (
    <main className="max-w-3xl mx-auto p-6 space-y-4">
      <BackButton />
      <h1 className="text-2xl font-semibold">Student Dashboard</h1>
      <p className="text-white/70">Pick your course and week, then start a voice session.</p>
      <div className="card">
        <p className="text-white/70">Course/Week/Voice pickers coming soon.</p>
      </div>
    </main>
  );
}
