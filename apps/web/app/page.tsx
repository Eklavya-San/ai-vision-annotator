export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-16">
        <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-slate-400">
          AI Vision Annotator
        </p>
        <h1 className="max-w-3xl text-5xl font-semibold tracking-tight sm:text-6xl">
          Annotate thousands of computer-vision images with natural language.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
          Upload a dataset, describe the defects or objects you want labeled, let a vision model generate annotations, and review the results before training.
        </p>
        <div className="mt-10 flex gap-4">
          <button className="rounded-lg bg-white px-5 py-3 font-medium text-slate-950">
            Create project
          </button>
          <button className="rounded-lg border border-slate-700 px-5 py-3 font-medium text-slate-200">
            View datasets
          </button>
        </div>
      </section>
    </main>
  );
}
