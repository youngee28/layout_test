import { AppLogo } from "@/components/home/app-logo";
import { LandingSidebar } from "@/components/home/landing-sidebar";
import { UploadCard } from "@/components/home/upload-card";

export function HomeLandingPage() {
  return (
    <div className="relative isolate min-h-screen overflow-hidden px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(circle_at_top,var(--glow-hero),transparent_58%)]" />
      <div className="pointer-events-none absolute inset-y-20 right-0 w-72 bg-[radial-gradient(circle,var(--glow-side),transparent_66%)] blur-3xl" />

      <div className="relative mx-auto flex min-h-[calc(100vh-2rem)] max-w-7xl flex-col gap-4 lg:gap-5">
        <header className="rounded-[var(--radius-shell)] border border-[var(--border-subtle)] bg-[var(--surface-shell)] px-5 py-4 shadow-[var(--shadow-soft)] backdrop-blur-xl sm:px-6">
          <div className="flex items-center gap-4 rounded-[calc(var(--radius-shell)-0.5rem)] border border-[var(--panel-border)] bg-[var(--surface-panel)] px-4 py-4 sm:px-5">
            <button
              type="button"
              aria-label="메뉴 열기"
              className="inline-flex size-11 items-center justify-center rounded-[calc(var(--radius-card)-0.5rem)] border border-[var(--border-subtle)] bg-[var(--surface-card)] text-[var(--text-secondary)] shadow-[var(--shadow-neutral-soft)]"
            >
              <svg
                aria-hidden="true"
                className="size-5"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M4 7H20M4 12H20M4 17H14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
            <AppLogo />
          </div>
        </header>

        <div className="grid flex-1 gap-4 lg:grid-cols-[17.5rem_minmax(0,1fr)] lg:gap-5">
          <LandingSidebar />

          <main className="order-1 flex min-h-[38rem] items-center rounded-[var(--radius-shell)] border border-[var(--border-subtle)] bg-[var(--surface-shell)] p-4 shadow-[var(--shadow-soft)] backdrop-blur-xl sm:p-5 lg:order-2 lg:p-6">
            <section className="relative flex w-full flex-1 items-center justify-center overflow-hidden rounded-[calc(var(--radius-shell)-0.5rem)] border border-[var(--panel-border)] bg-[var(--surface-panel)] px-5 py-12 sm:px-8 lg:px-12 lg:py-16">
              <div className="pointer-events-none absolute left-1/2 top-14 h-32 w-32 -translate-x-1/2 rounded-full bg-[radial-gradient(circle,var(--glow-hero),transparent_70%)] blur-2xl" />

              <div className="relative mx-auto flex w-full max-w-4xl flex-col items-center text-center">
                <div className="inline-flex items-center rounded-[var(--radius-pill)] border border-[var(--border-strong)] bg-[var(--accent-soft)] px-4 py-2 text-sm font-semibold text-[var(--accent-text)] shadow-[var(--shadow-accent-soft)]">
                  AI 인포그래픽 생성
                </div>

                <h1 className="mt-6 max-w-3xl text-4xl font-bold tracking-tight text-[var(--text-primary)] sm:text-5xl lg:text-6xl lg:leading-[1.1]">
                  표 데이터 업로드해서 <span className="bg-[linear-gradient(135deg,var(--accent),var(--accent-strong))] bg-clip-text text-transparent">인포그래픽</span>을 만들어보세요
                </h1>

                <p className="mt-6 max-w-3xl text-base leading-8 text-[var(--text-secondary)] sm:text-lg">
                  복잡한 표 데이터를 정리하고 시각화 아이디어와 인포그래픽을 바로 확인할 수 있습니다.
                </p>

                <div className="mt-10 w-full max-w-4xl">
                  <UploadCard />
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
