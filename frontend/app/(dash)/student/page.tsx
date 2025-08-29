'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import CoursePicker from '@/components/CoursePicker';
import WeekPicker from '@/components/WeekPicker';
import VoicePicker from '@/components/VoicePicker';
import { ArrowRight, LogOut } from 'lucide-react';

import OULawLogo from '@/components/OULawLogo';

export default function StudentDashboard() {
  const router = useRouter();
  const [courseId, setCourseId] = useState<number>();
  const [week, setWeek] = useState<number>();
  const [voiceId, setVoiceId] = useState<string>();

  const canStart = courseId && week && voiceId;

  const handleStartSession = () => {
    if (canStart) {
      router.push(`/voice/${courseId}/${week}?voice=${voiceId}`);
    }
  };

  const handleLogout = () => {
    // Clear auth and redirect
    router.push('/login');
  };

  return (
    <div className="min-h-screen p-4 bg-gradient-to-br from-ou-surface via-ou-panel to-ou-surface">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <OULawLogo />
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>

        {/* Selection Grid */}
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          <CoursePicker value={courseId} onChange={setCourseId} />
          <WeekPicker value={week} onChange={setWeek} />
          <VoicePicker value={voiceId} onChange={setVoiceId} />
        </div>

        {/* Session Summary */}
        {canStart && (
          <div className="bg-ou-panel rounded-xl p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Session Summary</h2>
            <div className="space-y-2 text-ou-cream/80">
              <p>• Course: {courseId === 1 ? 'Constitutional Law' : 'Regulatory Law'}</p>
              <p>• Week: {week}</p>
              <p>• Duration: 5 minutes maximum</p>
              <p>• Method: Socratic dialogue based on weekly readings</p>
            </div>
          </div>
        )}

        {/* Start Button */}
        <div className="flex justify-center">
          <Button
            size="lg"
            disabled={!canStart}
            onClick={handleStartSession}
            className="flex items-center gap-2 px-8"
          >
            Start Voice Session
            <ArrowRight className="w-5 h-5" />
          </Button>
        </div>

        {/* Instructions */}
        <div className="mt-12 p-6 bg-ou-panel/50 rounded-xl">
          <h3 className="font-semibold mb-3">How it works:</h3>
          <ol className="space-y-2 text-ou-cream/70">
            <li>1. Select your course and professor</li>
            <li>2. Choose the week you want to discuss</li>
            <li>3. Pick your preferred AI voice</li>
            <li>4. Start your 5-minute Socratic dialogue session</li>
            <li>5. The AI will guide you through the material with thoughtful questions</li>
          </ol>
        </div>
      </div>
    </div>
  );
}