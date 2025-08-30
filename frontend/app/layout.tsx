import "./globals.css";

export const metadata = {
  title: 'StudyAI Voice',
  description: 'OU Law Voice Assistant'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
