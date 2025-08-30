'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import WeekPicker from '@/components/WeekPicker';
import DragDropUpload from '@/components/DragDropUpload';
import OULawLogo from '@/components/OULawLogo';
import { LogOut, BookOpen, Users, BarChart } from 'lucide-react';

export default function ProfessorDashboard() {
  const router = useRouter();
  const [selectedWeek, setSelectedWeek] = useState<number>();
  // Replace mock initialization with an empty Set
  const [uploadedWeeks, setUploadedWeeks] = useState<Set<number>>(new Set());

  // On mount, fetch the actual uploaded weeks from the backend
  useEffect(() => {
    const fetchUploadedWeeks = async () => {
      try {
        const response = await fetch('/api/professor/uploaded-weeks');
        const data = await response.json();
        setUploadedWeeks(new Set(data.weeks));
      } catch (error) {
        console.error('Failed to fetch uploaded weeks:', error);
      }
    };
    fetchUploadedWeeks();
  }, []);
  const handleLogout = () => {
    // Clear authentication tokens
    localStorage.removeItem('authToken');
    sessionStorage.clear();
    // Could also call a logout API endpoint
    router.push('/login');
  };
  const handleUploadComplete = () => {
    if (selectedWeek) {
      setUploadedWeeks(prev => new Set(prev).add(selectedWeek));
    }
  };

  return (
    <div className="min-h-screen p-4 bg-gradient-to-br from-ou-surface via-ou-panel to-ou-surface">
      <div className="max-w-7xl mx-auto">
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

        {/* Dashboard Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Professor Dashboard</h1>
          <p className="text-ou-cream/70">Manage course materials and monitor student engagement</p>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-ou-panel/95 border-ou-crimson/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Students</CardTitle>
              <Users className="h-4 w-4 text-ou-crimson" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">124</div>
              <p className="text-xs text-ou-cream/60">Across all sections</p>
            </CardContent>
          </Card>

          <Card className="bg-ou-panel/95 border-ou-crimson/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Content Uploaded</CardTitle>
              <BookOpen className="h-4 w-4 text-ou-crimson" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{uploadedWeeks.size}/16</div>
              <p className="text-xs text-ou-cream/60">Weeks with materials</p>
            </CardContent>
          </Card>

          <Card className="bg-ou-panel/95 border-ou-crimson/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Sessions This Week</CardTitle>
              <BarChart className="h-4 w-4 text-ou-crimson" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">47</div>
              <p className="text-xs text-ou-cream/60">Student voice sessions</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Area */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Week Selection */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Select Week</h2>
            <WeekPicker value={selectedWeek} onChange={setSelectedWeek} />
            
            {selectedWeek && (
              <Card className="mt-4 bg-ou-panel/95 border-ou-crimson/20">
                <CardHeader>
                  <CardTitle className="text-lg">Week {selectedWeek} Status</CardTitle>
                </CardHeader>
                <CardContent>
                  {uploadedWeeks.has(selectedWeek) ? (
                    <div className="space-y-2">
                      <p className="text-green-400 flex items-center gap-2">
                        ✓ Materials uploaded and processed
                      </p>
                      <p className="text-sm text-ou-cream/60">3 PDFs • 127 pages • 450 chunks indexed</p>
                      <Button variant="outline" size="sm" className="mt-3">
                        View Materials
                      </Button>
                    </div>
                  ) : (
                    <p className="text-ou-cream/60">No materials uploaded yet</p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Upload Area */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Upload Materials</h2>
            {selectedWeek ? (
              <DragDropUpload 
                weekId={selectedWeek} 
                onUploadComplete={handleUploadComplete}
              />
            ) : (
              <Card className="bg-ou-panel/95 border-ou-crimson/20">
                <CardContent className="p-8 text-center">
                  <BookOpen className="w-12 h-12 mx-auto mb-4 text-ou-cream/30" />
                  <p className="text-ou-cream/60">
                    Select a week to upload course materials
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Recent Student Activity</h2>
          <Card className="bg-ou-panel/95 border-ou-crimson/20">
            <CardContent className="p-6">
              <div className="space-y-4">
                {[
                  { student: 'Emily Johnson', week: 3, duration: '4:52', time: '10 minutes ago' },
                  { student: 'Michael Chen', week: 2, duration: '5:00', time: '1 hour ago' },
                  { student: 'Sarah Williams', week: 3, duration: '4:31', time: '2 hours ago' },
                  { student: 'David Martinez', week: 1, duration: '3:45', time: '3 hours ago' },
                ].map((activity, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-ou-panel last:border-0">
                    <div>
                      <p className="font-medium">{activity.student}</p>
                      <p className="text-sm text-ou-cream/60">Week {activity.week} • {activity.duration}</p>
                    </div>
                    <p className="text-sm text-ou-cream/60">{activity.time}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}