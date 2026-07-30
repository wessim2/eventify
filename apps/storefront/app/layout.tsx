import './globals.css';

export const metadata = {
  title: 'Eventify Storefront',
  description: 'Discover and book seats for tech events near you.',
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
