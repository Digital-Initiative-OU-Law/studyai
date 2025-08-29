import React from 'react';

interface OULawLogoProps {
  className?: string;
  variant?: 'light' | 'dark';
}

export default function OULawLogo({ className = "", variant = 'dark' }: OULawLogoProps) {
  const primaryColor = variant === 'dark' ? '#841617' : '#FFF0D4';
  const secondaryColor = variant === 'dark' ? '#FFF0D4' : '#841617';
  
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative">
        <div className="w-12 h-12 bg-ou-crimson rounded-lg flex items-center justify-center shadow-lg">
          <span className="text-ou-cream font-bold text-xl">OU</span>
        </div>
        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-ou-cream rounded-full border-2 border-ou-crimson"></div>
      </div>
      <div>
        <h1 className="text-xl font-bold text-ou-cream leading-tight">
          University of Oklahoma
        </h1>
        <p className="text-sm text-ou-cream/80">
          College of Law • Voice Assistant
        </p>
      </div>
    </div>
  );
}