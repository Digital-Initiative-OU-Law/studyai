import React from 'react';

interface OULawLogoProps {
  className?: string;
  variant?: 'default' | 'inverse' | 'light' | 'dark';
}

export default function OULawLogo({ className = "", variant = 'default' }: OULawLogoProps) {
  // Compute class names based on variant
  const getVariantClasses = () => {
    switch (variant) {
      case 'inverse':
        return {
          logoBg: 'bg-ou-cream',
          logoText: 'text-ou-crimson',
          accentBg: 'bg-ou-crimson',
          accentBorder: 'border-ou-cream',
          titleText: 'text-ou-crimson',
          subtitleText: 'text-ou-crimson/80'
        };
      case 'light':
        return {
          logoBg: 'bg-ou-crimson/80',
          logoText: 'text-ou-cream',
          accentBg: 'bg-ou-cream/80',
          accentBorder: 'border-ou-crimson/80',
          titleText: 'text-ou-cream/90',
          subtitleText: 'text-ou-cream/70'
        };
      case 'dark':
        return {
          logoBg: 'bg-ou-crimson',
          logoText: 'text-ou-cream',
          accentBg: 'bg-ou-cream',
          accentBorder: 'border-ou-crimson',
          titleText: 'text-ou-cream',
          subtitleText: 'text-ou-cream/80'
        };
      default: // 'default' case
        return {
          logoBg: 'bg-ou-crimson',
          logoText: 'text-ou-cream',
          accentBg: 'bg-ou-cream',
          accentBorder: 'border-ou-crimson',
          titleText: 'text-ou-cream',
          subtitleText: 'text-ou-cream/80'
        };
    }
  };

  const classes = getVariantClasses();

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative">
        <div className={`w-12 h-12 ${classes.logoBg} rounded-lg flex items-center justify-center shadow-lg`}>
          <span className={`${classes.logoText} font-bold text-xl`}>OU</span>
        </div>
        <div className={`absolute -bottom-1 -right-1 w-3 h-3 ${classes.accentBg} rounded-full border-2 ${classes.accentBorder}`}></div>
      </div>
      <div>
        <h1 className={`text-xl font-bold ${classes.titleText} leading-tight`}>
          University of Oklahoma
        </h1>
        <p className={`text-sm ${classes.subtitleText}`}>
          College of Law • Voice Assistant
        </p>
      </div>
    </div>
  );
}