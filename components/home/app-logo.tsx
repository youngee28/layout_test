export function AppLogo() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-11 items-center justify-center rounded-[var(--radius-card)] bg-[linear-gradient(135deg,var(--accent),var(--accent-strong))] text-white shadow-[var(--shadow-card)]">
        <svg
          aria-hidden="true"
          className="size-5"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12 2.75L13.83 8.17L19.25 10L13.83 11.83L12 17.25L10.17 11.83L4.75 10L10.17 8.17L12 2.75Z"
            fill="currentColor"
          />
          <path
            d="M18.5 4.5L19.14 6.36L21 7L19.14 7.64L18.5 9.5L17.86 7.64L16 7L17.86 6.36L18.5 4.5Z"
            fill="currentColor"
            opacity="0.78"
          />
        </svg>
      </div>

      <div className="min-w-0">
        <p className="text-lg font-bold tracking-tight text-[var(--text-primary)] sm:text-xl">
          <span className="text-[var(--accent-text)]">TABLE AI</span> Studio
        </p>
      </div>
    </div>
  );
}
