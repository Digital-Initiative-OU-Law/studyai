'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GraduationCap, BookOpen, Shield } from 'lucide-react';

export default function RolePage() {
  const router = useRouter();

  const roles = [
    {
      id: 'student',
      title: 'Student',
      description: 'Access course materials and engage in Socratic dialogue',
      icon: GraduationCap,
      path: '/student',
      color: 'hover:border-ou-crimson/50',
    },
    {
      id: 'professor',
      title: 'Professor',
      description: 'Upload course materials and manage weekly content',
      icon: BookOpen,
      path: '/professor',
      color: 'hover:border-ou-crimson/50',
    },
    {
      id: 'admin',
      title: 'Administrator',
      description: 'Manage users and system configuration',
      icon: Shield,
      path: '/admin',
      color: 'hover:border-ou-crimson/50',
    },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Welcome to OU Law Voice Assistant</h1>
          <p className="text-ou-cream/70">Please select your role to continue</p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-6">
          {roles.map((role) => {
            const Icon = role.icon;
            return (
              <Card 
                key={role.id}
                className={`cursor-pointer transition-all duration-200 hover:scale-105 ${role.color}`}
                onClick={() => router.push(role.path)}
              >
                <CardHeader>
                  <div className="flex justify-center mb-4">
                    <div className="p-3 rounded-full bg-ou-crimson/20">
                      <Icon className="w-8 h-8 text-ou-crimson" />
                    </div>
                  </div>
                  <CardTitle className="text-center">{role.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-center">
                    {role.description}
                  </CardDescription>
                  <Button 
                    className="w-full mt-4"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Continue as {role.title}
                  </Button>                </CardContent>
              </Card>
            );
          })}
        </div>
        
        <div className="text-center mt-8">
          <Button
            variant="ghost"
            onClick={() => router.push('/login')}
          >
            Back to Login
          </Button>
        </div>
      </div>
    </div>
  );
}