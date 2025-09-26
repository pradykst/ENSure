import type { Metadata } from "next"
import { OrganizerForm } from "@/components/organiser-form"

export const metadata: Metadata = {
  title: "ENSure • Organizer Portal",
  description: "Create and configure events & hackathons.",
}

export default function Page() {
  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-8 md:py-12">
        <header className="mb-8 md:mb-12">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-balance">ENSure Organizer Portal</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-2">
            Create events and export a ready-to-share JSON config. Inspired by Luma’s clean, structured UI.
          </p>
        </header>
        <OrganizerForm />
      </div>
    </main>
  )
}
