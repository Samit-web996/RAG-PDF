import "./globals.css";
import { ClerkProvider, SignInButton, SignUpButton, UserButton } from '@clerk/nextjs';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className="min-h-screen bg-slate-950 text-white flex flex-col">
          {/* Top Navbar */}
          <header className="p-4 flex justify-between items-center border-b border-slate-800 bg-slate-900">
            <h1 className="text-xl font-bold text-blue-400">Easy-Go PDF RAG</h1>
            
            <div className="flex gap-4 items-center">
              {/* Sahi conditional rendering ya normal buttons flow */}
              <SignInButton mode="modal">
                <button className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm font-medium">Sign In</button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded text-sm font-medium">Sign Up</button>
              </SignUpButton>
              <UserButton afterSignOutUrl="/" />
            </div>
          </header>

          {/* Main Container jahan page content aur file upload dikhega */}
          <main className="flex-1 flex flex-col p-6 items-center justify-center">
            {children}
          </main>
        </body>
      </html>
    </ClerkProvider>
  );
}