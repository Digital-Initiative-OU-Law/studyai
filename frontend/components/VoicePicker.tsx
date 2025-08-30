'use client';

import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Mic } from 'lucide-react';

interface Voice {
  id: string;
  name: string;
  description: string;
}

interface VoicePickerProps {
  value?: string;
  onChange: (voiceId: string) => void;
  voices?: Voice[];
}

const defaultVoices: Voice[] = [
  { id: 'TxGEqnHWrfWFTfGW9XjX', name: 'Sean', description: 'Professional, warm tone' },
  { id: 'VR6AewLTigWG4xSOukaG', name: 'Rachel', description: 'Clear, articulate' },
  { id: 'ZQe5CZNOzWyzPSCn5a3c', name: 'James', description: 'Authoritative, calm' },
  { id: '9BWtsMINqrJLrRacOk9x', name: 'Sarah', description: 'Friendly, engaging' },
  { id: 'IKne3meq5aSn9XLyUdCD', name: 'Michael', description: 'Deep, measured' },
];
export default function VoicePicker({ value, onChange, voices = defaultVoices }: VoicePickerProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mic className="w-5 h-5" />
          Select Voice
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {voices.map((voice) => (
          <button
            key={voice.id}
            onClick={() => onChange(voice.id)}
            className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
              value === voice.id
                ? 'border-ou-crimson bg-ou-crimson/10'
                : 'border-ou-panel hover:border-ou-crimson/50'
            }`}
          >
            <div className="font-semibold">{voice.name}</div>
            <div className="text-sm text-ou-cream/70">{voice.description}</div>
          </button>
        ))}
      </CardContent>
    </Card>
  );
}