import './globals.css'

export const metadata = {
  title: 'KDNA Web Asset Viewer',
  description: 'Inspect, plan, and load a KDNA judgment asset in a browser.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
