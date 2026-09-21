import { appName } from './lib/appInfo'

// Phase 0: an empty shell that proves the build, styling and tests work.
// Phase 1 replaces this with the timeline and the camera button.
export default function App() {
  return (
    <main className="flex min-h-full flex-col items-center justify-center gap-2 p-6 text-center">
      <h1 className="text-3xl font-bold">{appName}</h1>
      <p className="text-base opacity-70">Snap a photo. Save the win.</p>
    </main>
  )
}
