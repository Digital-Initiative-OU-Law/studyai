"use client";

import { useRouter } from "next/navigation";
import BackButton from "@/components/BackButton";

export default function RolePage() {
  const router = useRouter();
  return (
    <main className="max-w-2xl mx-auto p-6">
      <BackButton href="/" />
      <h1 className="text-2xl font-semibold mb-2">Choose Your Role</h1>
      <p className="text-white/70 mb-6">Select how you want to use StudyAI today.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card">
          <h2 className="font-semibold mb-2">Student</h2>
          <p className="text-white/70 mb-4">Pick course and week and start a five‑minute voice session.</p>
          <button className="btn" onClick={()=>router.push("/student")}>Go to Student</button>
        </div>
        <div className="card">
          <h2 className="font-semibold mb-2">Professor</h2>
          <p className="text-white/70 mb-4">Upload weekly PDFs and monitor ingestion progress.</p>
          <button className="btn" onClick={()=>router.push("/professor")}>Go to Professor</button>
        </div>
      </div>
    </main>
  );
}
