'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { GraduationCap } from 'lucide-react';

interface Course {
  id: number;
  code: string;
  name: string;
  professor_name: string;
}

interface CoursePickerProps {
  value?: number;
  onChange: (courseId: number) => void;
}

export default function CoursePicker({ value, onChange }: CoursePickerProps) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        // TODO: Replace with actual API call
        // const response = await api.getCourses();
        const mockCourses = [
          {
            id: 1,
            code: 'LAW6301',
            name: 'Constitutional Law',
            professor_name: 'Sean A. Harrington',
          },
          {
            id: 2,
            code: 'LAW6302',
            name: 'Regulatory Law',
            professor_name: 'Kenton Brice',
          },
        ];
        setCourses(mockCourses);
      } catch (error) {
        console.error('Failed to fetch courses:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, []);
  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <CardTitle>Select Course</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-24 bg-ou-panel/50 rounded"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GraduationCap className="w-5 h-5" />
          Select Course
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {courses.map((course) => (
          <button
            key={course.id}
            onClick={() => onChange(course.id)}
            className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
              value === course.id
                ? 'border-ou-crimson bg-ou-crimson/10'
                : 'border-ou-panel hover:border-ou-crimson/50'
            }`}
          >
            <div className="font-semibold">{course.code} - {course.name}</div>
            <div className="text-sm text-ou-cream/70">Professor {course.professor_name}</div>
          </button>
        ))}
      </CardContent>
    </Card>
  );
}