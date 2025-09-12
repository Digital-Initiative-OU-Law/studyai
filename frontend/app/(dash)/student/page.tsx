"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import BackButton from "@/components/BackButton";

interface Course {
  id: number;
  code: string;
  name: string;
}

interface Week {
  id: number;
  number: number;
  title?: string;
}

interface VoiceOption {
  id: string;
  name: string;
}

export default function StudentPage() {
  const router = useRouter();
  
  // Selection state
  const [courses, setCourses] = useState<Course[]>([]);
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<number | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [selectedVoice, setSelectedVoice] = useState<string>("");
  
  // Loading states
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadingWeeks, setLoadingWeeks] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [summary, setSummary] = useState<string>("");
  
  // Voice options from environment
  const voiceOptions: VoiceOption[] = [
    { id: "voice1", name: "Voice 1 - Professional" },
    { id: "voice2", name: "Voice 2 - Friendly" },
    { id: "voice3", name: "Voice 3 - Academic" },
    { id: "voice4", name: "Voice 4 - Conversational" },
    { id: "voice5", name: "Voice 5 - Sean (Custom)" }
  ];
  
  // Fetch courses on mount
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000"}/catalog/courses`);
        if (res.ok) {
          const data = await res.json();
          setCourses(data);
          // Auto-select if only one course
          if (data.length === 1) {
            setSelectedCourse(data[0].id);
          }
          // Load saved selection
          const savedCourse = localStorage.getItem('studentSelectedCourse');
          if (savedCourse && data.some((c: Course) => c.id === parseInt(savedCourse))) {
            setSelectedCourse(parseInt(savedCourse));
          }
        }
      } catch (e) {
        console.error("Error fetching courses:", e);
      } finally {
        setLoadingCourses(false);
      }
    };
    fetchCourses();
    
    // Load saved voice selection
    const savedVoice = localStorage.getItem('studentSelectedVoice');
    if (savedVoice) {
      setSelectedVoice(savedVoice);
    } else {
      setSelectedVoice(voiceOptions[0].id);
    }
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
          // Load saved week
          const savedWeek = localStorage.getItem('studentSelectedWeek');
          if (savedWeek && data.some((w: Week) => w.id === parseInt(savedWeek))) {
            setSelectedWeek(parseInt(savedWeek));
          }
        }
      } catch (e) {
        console.error("Error fetching weeks:", e);
      } finally {
        setLoadingWeeks(false);
      }
    };
    
    fetchWeeks();
    localStorage.setItem('studentSelectedCourse', selectedCourse.toString());
  }, [selectedCourse]);
  
  // Save selections
  useEffect(() => {
    if (selectedWeek) {
      localStorage.setItem('studentSelectedWeek', selectedWeek.toString());
    }
  }, [selectedWeek]);
  
  useEffect(() => {
    if (selectedVoice) {
      localStorage.setItem('studentSelectedVoice', selectedVoice);
    }
  }, [selectedVoice]);
  
  // Fetch summary when week is selected
  useEffect(() => {
    if (!selectedWeek) {
      setSummary("");
      return;
    }
    
    const fetchSummary = async () => {
      setLoadingSummary(true);
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000"}/summaries?week_id=${selectedWeek}`);
        if (res.ok) {
          const data = await res.json();
          setSummary(data.content || "");
        }
      } catch (e) {
        console.error("Error fetching summary:", e);
      } finally {
        setLoadingSummary(false);
      }
    };
    
    fetchSummary();
  }, [selectedWeek]);
  
  const startSession = () => {
    if (!selectedCourse || !selectedWeek || !selectedVoice) return;
    
    const course = courses.find(c => c.id === selectedCourse);
    const week = weeks.find(w => w.id === selectedWeek);
    
    if (!course || !week) return;
    
    // Navigate to voice session page with course code and week number
    router.push(`/voice/${course.code}/${week.number}?voice=${selectedVoice}`);
  };
  
  const canStart = selectedCourse && selectedWeek && selectedVoice;
  
  return (
    <main className="max-w-3xl mx-auto p-6 space-y-4">
      <BackButton />
      <h1 className="text-2xl font-semibold">Student Dashboard</h1>
      <p className="text-white/70">Pick your course, week, and voice, then start a voice session.</p>
      
      {/* Selection Controls */}
      <div className="card space-y-4">
        <h2 className="text-lg font-medium">Session Setup</h2>
        
        {/* Course Selector */}
        <div>
          <label className="block text-sm text-white/70 mb-1">Course</label>
          <select 
            className="w-full px-3 py-2 bg-black/40 border border-white/20 rounded-lg text-white"
            value={selectedCourse || ""}
            onChange={(e) => setSelectedCourse(parseInt(e.target.value))}
            disabled={loadingCourses}
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
          <label className="block text-sm text-white/70 mb-1">Week</label>
          <select 
            className="w-full px-3 py-2 bg-black/40 border border-white/20 rounded-lg text-white"
            value={selectedWeek || ""}
            onChange={(e) => setSelectedWeek(parseInt(e.target.value))}
            disabled={!selectedCourse || loadingWeeks}
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
                    Week {week.number}{week.title ? ` - ${week.title}` : ""}
                  </option>
                ))}
              </>
            )}
          </select>
        </div>
        
        {/* Voice Selector */}
        <div>
          <label className="block text-sm text-white/70 mb-1">Voice</label>
          <select 
            className="w-full px-3 py-2 bg-black/40 border border-white/20 rounded-lg text-white"
            value={selectedVoice}
            onChange={(e) => setSelectedVoice(e.target.value)}
          >
            {voiceOptions.map(voice => (
              <option key={voice.id} value={voice.id}>
                {voice.name}
              </option>
            ))}
          </select>
        </div>
        
        {/* Start Session Button */}
        <button 
          className="btn w-full" 
          onClick={startSession}
          disabled={!canStart}
        >
          {canStart ? "Start Voice Session" : "Please make all selections"}
        </button>
      </div>
      
      {/* Summary Display */}
      {selectedWeek && (
        <div className="card space-y-2">
          <h2 className="text-lg font-medium">Week Summary</h2>
          {loadingSummary ? (
            <p className="text-white/70">Loading summary...</p>
          ) : summary ? (
            <p className="text-white/80 whitespace-pre-wrap">{summary}</p>
          ) : (
            <p className="text-white/50 italic">No summary available for this week yet.</p>
          )}
        </div>
      )}
    </main>
  );
}
