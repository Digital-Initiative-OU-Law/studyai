"use client";

import { useState, useEffect } from "react";
import BackButton from "@/components/BackButton";

interface JobStatus {
  id: number;
  status: string;
  progress: number;
  error?: string;
}

interface Course {
  id: number;
  code: string;
  name: string;
}

interface Week {
  id: number;
  week_number: number;
  title?: string;
}

export default function ProfessorPage() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string>("");
  const [jobId, setJobId] = useState<number | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // Course and week selection
  const [courses, setCourses] = useState<Course[]>([]);
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<number | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadingWeeks, setLoadingWeeks] = useState(false);

  // Fetch courses on mount
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000"}/catalog/courses`);
        if (res.ok) {
          const data = await res.json();
          setCourses(data);
          // Load from localStorage if available
          const savedCourse = localStorage.getItem('professorSelectedCourse');
          if (savedCourse && data.some((c: Course) => c.id === parseInt(savedCourse))) {
            setSelectedCourse(parseInt(savedCourse));
          } else if (data.length === 1) {
            // Auto-select first course if only one exists and no valid saved selection
            setSelectedCourse(data[0].id);
          }
        }
      } catch (e) {
        console.error("Error fetching courses:", e);
      } finally {
        setLoadingCourses(false);
      }
    };
    fetchCourses();
  }, []);

  // Fetch weeks when course is selected
  useEffect(() => {
    if (!selectedCourse) {
      setWeeks([]);
      return;
    }
    
    const fetchWeeks = async () => {
      setLoadingWeeks(true);
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000"}/catalog/weeks?course_id=${selectedCourse}`);
        if (res.ok) {
          const data = await res.json();
          setWeeks(data);
          // Load saved week selection
          const savedWeek = localStorage.getItem('professorSelectedWeek');
          if (savedWeek && data.some((w: Week) => w.id === parseInt(savedWeek))) {
            setSelectedWeek(parseInt(savedWeek));
          } else if (data.length > 0) {
            setSelectedWeek(data[0].id);
          }
        }
      } catch (e) {
        console.error("Error fetching weeks:", e);
      } finally {
        setLoadingWeeks(false);
      }
    };
    
    fetchWeeks();
    // Save course selection
    localStorage.setItem('professorSelectedCourse', selectedCourse.toString());
  }, [selectedCourse]);

  // Save week selection
  useEffect(() => {
    if (selectedWeek) {
      localStorage.setItem('professorSelectedWeek', selectedWeek.toString());
    }
  }, [selectedWeek]);

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
    if (!file || !selectedWeek) {
      setStatus("Please select a course, week, and file");
      return;
    }
    setIsUploading(true);
    setStatus("Uploading…");
    setJobStatus(null);
    
    try {
      const fd = new FormData();
      fd.append("file", file);
      const url = `${process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000"}/readings/upload?week_id=${selectedWeek}`;
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
      <p className="text-white/70">Select course and week, then upload PDFs for your students.</p>
      
      {/* Course and Week Selection */}
      <div className="card space-y-4">
        <h2 className="text-lg font-medium">Course & Week Selection</h2>
        
        <div className="grid grid-cols-2 gap-4">
          {/* Course Selector */}
          <div>
            <label htmlFor="course-select" className="block text-sm text-white/70 mb-1">Course</label>
            <select 
              className="w-full px-3 py-2 bg-black/40 border border-white/20 rounded-lg text-white"
              id="course-select"
              value={selectedCourse || ""}
              onChange={(e) => {
                const value = e.target.value;
                setSelectedCourse(value === "" ? null : parseInt(value, 10));
              }}
              disabled={loadingCourses || isUploading || !!jobId}
            >
              {loadingCourses ? (
                <option value="">Loading courses...</option>
              ) : courses.length === 0 ? (
                <option value="">No courses available</option>
              ) : (
                <>
                  <option value="">Select a course</option>
                  {courses.map(course => (
                    <option key={course.id} value={course.id}>
                      {course.code} - {course.name}
                    </option>
                  ))}
                </>
              )}
            </select>
          </div>
          
          {/* Week Selector */}
          <div>
            <label htmlFor="week-select" className="block text-sm text-white/70 mb-1">Week</label>
            <select 
              className="w-full px-3 py-2 bg-black/40 border border-white/20 rounded-lg text-white"
              id="week-select"
              value={selectedWeek || ""}
              onChange={(e) => {
                const value = e.target.value;
                setSelectedWeek(value === "" ? null : parseInt(value, 10));
              }}
              disabled={!selectedCourse || loadingWeeks || isUploading || !!jobId}
            >
              {!selectedCourse ? (
                <option value="">Select a course first</option>
              ) : loadingWeeks ? (
                <option value="">Loading weeks...</option>
              ) : weeks.length === 0 ? (
                <option value="">No weeks available</option>
              ) : (
                <>
                  <option value="">Select a week</option>
                  {weeks.map(week => (
                    <option key={week.id} value={week.id}>
                      Week {week.week_number}{week.title ? ` - ${week.title}` : ""}
                    </option>
                  ))}
                </>
              )}
            </select>
          </div>
        </div>
        
        {/* Show selected course and week */}
        {selectedCourse && selectedWeek && (
          <div className="p-3 bg-green-900/20 border border-green-500/30 rounded-lg">
            <p className="text-sm text-green-400">
              Ready to upload for: {courses.find(c => c.id === selectedCourse)?.name}, 
              Week {weeks.find(w => w.id === selectedWeek)?.week_number}
            </p>
          </div>
        )}
      </div>

      {/* File Upload Section */}
      <div className="card space-y-3">
        <h2 className="text-lg font-medium">Upload PDF</h2>
        <input 
          type="file" 
          accept="application/pdf" 
          aria-label="Upload PDF file"
          onChange={(e)=>setFile(e.target.files?.[0] || null)} 
          disabled={isUploading || !!jobId || !selectedWeek}
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
            disabled={!file || !selectedWeek || isUploading || !!jobId}
          >
            {isUploading ? "Uploading..." : jobId ? "Processing..." : "Upload PDF"}
          </button>
          {status && <span className="text-white/70">{status}</span>}
        </div>
      </div>
    </main>
  );
}
