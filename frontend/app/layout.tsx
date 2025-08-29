export const metadata = {
  title: 'StudyAI Voice',
  description: 'OU Law Voice Assistant'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ background: '#0A0A0A', color: '#fff', margin: 0 }}>{children}</body>
    </html>
  );
}

