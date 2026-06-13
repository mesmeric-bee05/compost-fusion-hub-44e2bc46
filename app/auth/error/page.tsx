export default function Error() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Authentication Error</h1>
        <p className="mt-4">
          Something went wrong with authentication. Please try again later.
        </p>
        <a href="/auth/signin" className="mt-6 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700">
          Go to Sign In
        </a>
      </div>
    </div>
  )
}