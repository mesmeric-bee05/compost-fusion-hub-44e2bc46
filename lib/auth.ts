import { PrismaAdapter } from "@auth/prisma-adapter"
import { PrismaClient } from "@prisma/client"
import NextAuth, { AuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"

// Prisma client instance
const prisma = new PrismaClient()

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        phone: { label: "Phone", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        // This is where you would validate the user credentials
        // For now, we'll return a dummy user if credentials are correct
        // In a real app, you would check against the database

        // Example: check if phone and password match a user in the database
        // const user = await prisma.user.findFirst({
        //   where: {
        //     phone: credentials?.phone,
        //     // Note: In a real app, you would hash the password and compare
        //   }
        // })

        // For demonstration, we'll return a dummy user
        if (credentials?.phone === "254700000000" && credentials?.password === "password") {
          return {
            id: "1",
            name: "John Doe",
            email: "john@example.com",
            phone: "254700000000",
            // Add other fields as needed
          }
        }

        return null
      }
    })
  ],
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async session({ session, token, user }) {
      // Add user ID to session
      if (session.user) {
        session.user.id = token.sub
        session.user.role = token.role as string
      }
      return session
    },
    async jwt({ token, user, account }) {
      // Add role to token when signing in
      if (user) {
        token.role = user.role
      }
      return token
    }
  },
  secret: process.env.NEXTAUTH_SECRET,
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }