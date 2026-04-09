"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { stashUploadedScene } from "@/schema/uploaded_scene_storage";

const fileTypes = ["CSV", "XLSX"] as const;

function isCsvFile(file: File) {
  return (
    file.name.toLowerCase().endsWith(".csv") ||
    file.type === "text/csv" ||
    file.type === "application/vnd.ms-excel"
  );
}

export function UploadCard() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);

  async function handleFileSelection(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    setSelectedFileName(file.name);
    setErrorMessage(null);

    if (!isCsvFile(file)) {
      setErrorMessage("현재 업로드 생성 경로는 CSV 파일만 지원합니다.");
      return;
    }

    setIsLoading(true);

    try {
      const csvText = await file.text();

      if (!csvText.trim()) {
        throw new Error("업로드한 CSV 파일이 비어 있습니다.");
      }

      const response = await fetch("/api/scene", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ csvText }),
      });
      const data: unknown = await response.json();

      if (!response.ok) {
        const message =
          typeof data === "object" && data !== null && "error" in data && typeof data.error === "string"
            ? data.error
            : "Scene generation failed.";

        throw new Error(message);
      }

      stashUploadedScene(data);
      router.push("/canvas");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Scene generation failed.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="w-full">
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="sr-only"
        onChange={handleFileSelection}
        disabled={isLoading}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={isLoading}
        className="group relative block w-full overflow-hidden rounded-[var(--radius-shell)] border border-[var(--border-strong)] bg-[var(--surface-card)] p-4 text-left shadow-[var(--shadow-soft)] hover:-translate-y-1 hover:shadow-[var(--shadow-accent-hover)] disabled:cursor-wait disabled:opacity-80 sm:p-6"
      >
        <div className="absolute inset-4 rounded-[calc(var(--radius-shell)-0.5rem)] border border-dashed border-[var(--border-strong)] bg-[image:var(--upload-card-gradient)]" />

        <div className="relative flex min-h-[20rem] flex-col items-center justify-center gap-6 px-4 py-8 text-center sm:px-10">
          <div className="flex size-20 items-center justify-center rounded-[var(--radius-card)] bg-[var(--accent-soft)] text-[var(--accent)] shadow-[var(--shadow-card)] group-hover:-translate-y-1">
            <svg
              aria-hidden="true"
              className="size-9"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 16V8M12 8L8.75 11.25M12 8L15.25 11.25"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M7.25 19.25H16.75C18.5449 19.25 20 17.7949 20 16V15.7C20 14.307 18.893 13.2 17.5 13.2C17.4527 13.2 17.4061 13.202 17.3602 13.2058C16.8074 10.5677 14.4684 8.58331 11.6667 8.58331C8.45501 8.58331 5.83337 11.205 5.83337 14.4166C5.83337 14.5313 5.83671 14.6452 5.84335 14.7581C4.76185 15.1661 4 16.2107 4 17.4333C4 19.0135 5.27647 20.2899 6.85671 20.2899"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <div className="space-y-3">
            <p className="text-2xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-3xl">
              CSV, XLSX 파일을 업로드하세요
            </p>
            <p className="mx-auto max-w-2xl text-sm leading-7 text-[var(--text-secondary)] sm:text-base">
              {isLoading
                ? "CSV를 읽고 장면을 생성하는 중입니다. 완료되면 캔버스로 이동합니다."
                : "클릭해서 CSV 파일을 선택하면 장면을 생성한 뒤 바로 편집기로 이동합니다."}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            {fileTypes.map((fileType) => (
              <span
                key={fileType}
                className="rounded-[var(--radius-pill)] border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-4 py-2 text-sm font-semibold tracking-[0.18em] text-[var(--text-secondary)]"
              >
                {fileType}
              </span>
            ))}
          </div>

          <div className="flex flex-col items-center gap-3">
            <span className="rounded-[var(--radius-pill)] border border-[var(--border-subtle)] bg-[var(--surface-panel)] px-4 py-2 text-sm text-[var(--text-secondary)] shadow-[var(--shadow-accent-soft)]">
              {selectedFileName ? `선택된 파일: ${selectedFileName}` : "현재 실제 업로드 경로는 CSV만 지원합니다."}
            </span>

            {errorMessage ? (
              <p className="max-w-2xl text-sm leading-7 text-[var(--accent-text)]">{errorMessage}</p>
            ) : null}
          </div>
        </div>
      </button>
    </div>
  );
}
