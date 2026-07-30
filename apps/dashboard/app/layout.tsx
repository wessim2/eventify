import './globals.css';

export const metadata = {
  title: 'Eventify Organizer Dashboard',
  description: 'Control plane for tech-event organizers.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
