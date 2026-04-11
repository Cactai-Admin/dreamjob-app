import { redirect } from 'next/navigation'

// Root redirects to the main dashboard.
// Middleware handles unauthenticated users before this runs.
export default function RootPage() {
  redirect('/jobs')
}
