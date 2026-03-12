import HeroInput from "@/components/landing/HeroInput";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f5f3ef] flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 max-w-6xl mx-auto w-full">
        <span className="text-lg font-semibold tracking-tight text-gray-900">
          Aria<span className="text-gray-400 font-light"> Career Agent</span>
        </span>
        <a
          href="/chat"
          className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          Open Chat →
        </a>
      </nav>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <div className="text-center mb-12 max-w-3xl">
          <h1 className="text-5xl font-bold tracking-tight text-gray-900 leading-tight mb-4">
            Your next role,{" "}
            <em className="font-serif font-normal italic">found.</em>
            <br />
            Coached, searched, and landed.
          </h1>
          <p className="text-lg text-gray-500 max-w-xl mx-auto">
            An AI agent that searches thousands of jobs daily, coaches you through
            interviews, and sends the best matches straight to your inbox.
          </p>
        </div>

        <HeroInput />
      </div>

      {/* Footer */}
      <footer className="text-center py-6 text-xs text-gray-400">
        Built with Claude AI · Powered by Adzuna · Emails by Resend
      </footer>
    </main>
  );
}
