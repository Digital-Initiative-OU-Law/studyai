"use client";

import { useState, useEffect } from "react";
import BackButton from "@/components/BackButton";

interface JobStatus {
  id: number;
  status: string;
  progress: number;
  error?: string;
}

export default function ProfessorPage() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string>("");
  const [jobId, setJobId] = useState<number | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Poll for job status
  useEffect(() => {
    if (!jobId) return;
    
    const checkStatus = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000"}/readings/jobs/${jobId}`);
        if (!res.ok) return;
        
        const data = await res.json();
        setJobStatus(data);
        
        // Stop polling if job is complete or failed
        if (data.status === "done" || data.status === "error") {
          setJobId(null);
          if (data.status === "done") {
            setStatus("✅ PDF processed successfully!");
          } else {
            setStatus(`❌ Processing failed: ${data.error || "Unknown error"}`);
          }
        }
      } catch (e) {
        console.error("Error checking job status:", e);
      }
    };
    
    // Check immediately
    checkStatus();
    
    // Then poll every 2 seconds
    const interval = setInterval(checkStatus, 2000);
    
    return () => clearInterval(interval);
  }, [jobId]);

  const onUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    setStatus("Uploading…");
    setJobStatus(null);
    
    try {
      const fd = new FormData();
      fd.append("file", file);
      const url = `${process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000"}/readings/upload?week_id=1`;
      const res = await fetch(url, {
        method: "POST",
        body: fd
      });
      const ctype = res.headers.get("content-type") || "";
      const payload = ctype.includes("application/json") ? await res.json() : await res.text();
      if (!res.ok) {
        const detail = typeof payload === "string" ? payload : (payload?.detail || "Upload failed");
        throw new Error(`HTTP ${res.status} – ${detail}`);
      }
      
      setStatus("Processing PDF...");
      setJobId(payload.job_id);
      setJobStatus({ id: payload.job_id, status: "queued", progress: 0 });
    } catch (e: any) {
      setStatus(e?.message || String(e));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-4">
      <BackButton />
      <h1 className="text-2xl font-semibold">Professor Dashboard</h1>
      <p className="text-white/70">Upload weekly PDFs and track ingestion jobs.</p>
      <div className="card space-y-3">
        <input 
          type="file" 
          accept="application/pdf" 
          onChange={(e)=>setFile(e.target.files?.[0] || null)} 
          disabled={isUploading || !!jobId}
        />
        
        {/* Progress indicator */}
        {jobStatus && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>
                {jobStatus.status === "queued" && "⏳ Queued for processing..."}
                {jobStatus.status === "running" && "⚙️ Processing PDF..."}
                {jobStatus.status === "done" && "✅ Processing complete!"}
                {jobStatus.status === "error" && "❌ Processing failed"}
              </span>
              <span>{jobStatus.progress}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${
                  jobStatus.status === "error" ? "bg-red-500" : 
                  jobStatus.status === "done" ? "bg-green-500" : "bg-blue-500"
                }`}
                style={{ width: `${jobStatus.progress}%` }}
              />
            </div>
          </div>
        )}
        
        <div className="flex gap-2 items-center">
          <button 
            className="btn" 
            onClick={onUpload} 
            disabled={!file || isUploading || !!jobId}
          >
            {isUploading ? "Uploading..." : jobId ? "Processing..." : "Upload PDF"}
          </button>
          {status && <span className="text-white/70">{status}</span>}
        </div>
      </div>
    </main>
  );
}
