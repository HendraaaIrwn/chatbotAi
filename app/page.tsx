export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-6 py-16">
        <p className="text-sm font-medium text-amber-300">Chatbot Platform</p>
        <h1 className="mt-4 max-w-3xl text-5xl font-semibold tracking-tight">
          Build, manage, and chat with project agents.
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-slate-300">
          A minimal workspace for users, projects, prompts, files, and OpenAI
          Responses API conversations.
        </p>
      </section>
    </main>
  );
}
