import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function Dashboard() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/auth/signin")
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex items-center space-x-4">
          <span className="text-muted-foreground">
            Signed in as {session.user?.name}
          </span>
          <a
            href="/api/auth/signout"
            className="text-sm font-medium text-muted-foreground hover:underline"
          >
            Sign out
          </a>
        </div>
      </header>

      <main className="space-y-6">
        <section className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">Welcome to Captain Compost</h2>
          <p className="text-muted-foreground">
            This is your dashboard where you can manage your composting services,
            view your impact, and schedule waste collections.
          </p>
        </section>

        {/* Placeholder for future features */}
        <div className="grid gap-6 md:grid-cols-2">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="font-semibold mb-4">Schedule Collection</h3>
            <p className="text-muted-foreground">
              Schedule a waste collection for your location.
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="font-semibold mb-4">View Impact</h3>
            <p className="text-muted-foreground">
              See how much waste you've diverted from landfills.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}