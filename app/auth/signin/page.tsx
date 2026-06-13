"use client"

import { signIn } from "next-auth/react"
import { useState } from "react"

export default function SignIn() {
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    try {
      const result = await signIn("credentials", {
        phone,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError(result.error)
      }
    } catch (err) {
      setError("An error occurred")
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Sign in to Captain Compost</h1>
          <p className="text-muted-foreground">
            Access your account to manage waste collection and composting services
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="phone" className="mb-2 block text-sm font-medium text-muted-foreground">
              Phone Number
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              className="w-full rounded-border border-input bg-background px-3 py-2 text-sm ring-offset-transparent file:border-0 file:bg-transparent file:text-sm file:focus-visible:outline-none"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-medium text-muted-foreground">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-border border-input bg-background px-3 py-2 text-sm ring-offset-transparent file:border-0 file:bg-transparent file:text-sm file:focus-visible:outline-none"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <button
            type="submit"
            className="w-full flex justify-center items-center rounded-border bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Sign In
          </button>
        </form>

        <div className="text-center text-sm text-muted-foreground">
          Don't have an account?{' '}
          <a href="#" className="underline underline-offset-4">
            Sign Up
          </a>
        </div>
      </div>
    </div>
  )
}