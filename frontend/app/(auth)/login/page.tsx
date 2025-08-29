'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';
import { auth } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await auth.login(email, password);
      router.push('/role');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-ou-surface via-ou-panel to-ou-surface">
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]"></div>
      <Card className="w-full max-w-md relative z-10 bg-ou-panel/95 backdrop-blur border-ou-crimson/20">
        <CardHeader className="space-y-1 pb-8">
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 bg-ou-crimson rounded-2xl flex items-center justify-center shadow-xl">
              <span className="text-ou-cream font-bold text-3xl">OU</span>
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-center text-ou-cream">
            Welcome to StudyAI
          </CardTitle>
          <CardDescription className="text-center text-ou-cream/70">
            University of Oklahoma College of Law
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-red-900/20 border border-red-900/50 text-red-400 text-sm">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="student@ou.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-ou-panel border border-ou-panel rounded-lg focus:outline-none focus:ring-2 focus:ring-ou-crimson"
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 bg-ou-panel border border-ou-panel rounded-lg focus:outline-none focus:ring-2 focus:ring-ou-crimson"
                required
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button 
              type="submit" 
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
            <p className="text-sm text-center text-ou-cream/70">
              Don't have an account?{' '}
              <Link href="/register" className="text-ou-crimson hover:underline">
                Register here
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}