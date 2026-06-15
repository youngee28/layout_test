"use client";

import { CenterPanel } from "@/components/canvas/panels/center_panel";
import { LeftPanel } from "@/components/canvas/panels/left_panel";
import { RightPanel } from "@/components/canvas/panels/right_panel";
import { useCanvasState } from "@/components/canvas/store/use_canvas_state";

export function CanvasLayout() {
  const canvasState = useCanvasState();

  return (
    <div className="relative isolate min-h-screen overflow-hidden px-4 py-4 sm:px-6 sm:py-6 lg:px-6 lg:py-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(circle_at_top,var(--glow-hero),transparent_58%)]" />
      <div className="pointer-events-none absolute inset-y-20 right-0 w-72 bg-[radial-gradient(circle,var(--glow-side),transparent_66%)] blur-3xl" />

      <div className="relative flex min-h-screen items-stretch justify-stretch">
        <main className="flex w-full flex-col gap-8 rounded-[var(--radius-shell)] border border-[var(--border-subtle)] bg-[var(--surface-shell)] p-4 shadow-[var(--shadow-soft)] backdrop-blur-xl sm:p-5 lg:p-6">
          {/* 주석 처리된 헤더 유지 */}
          {/* <header className="rounded-[calc(var(--radius-shell)-0.5rem)] border border-[var(--panel-border)] bg-[var(--surface-panel)] px-4 py-4 sm:px-8">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent-text)]">
              Canvas
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-[var(--text-primary)] sm:text-4xl">
              캔버스 편집 테스트
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-secondary)] sm:text-base">
              {canvasState.helperText}
            </p>
          </header> */}


          <div className="grid flex-1 grid-cols-1 gap-6 lg:grid-cols-[1fr_800px_1fr]">
            <LeftPanel
              selectedTextElement={canvasState.selectedTextElement}
              onChange={canvasState.handleTextChange}
              onDelete={canvasState.handleDeleteElement}
              onUndo={canvasState.handleUndo}
              canUndo={canvasState.canUndo}
              onAddText={canvasState.handleAddText}
            />
            <CenterPanel
              scene={canvasState.scene}
              sceneKey={canvasState.sceneKey}
              selectedElementId={canvasState.selectedElementId}
              pendingEditId={canvasState.pendingEditId}
              errorMessage={canvasState.errorMessage}
              onSelectElement={canvasState.setSelectedElementId}
              onChangeElement={canvasState.handleChangeElement}
              onClearSelection={() => canvasState.setSelectedElementId(null)}
              onClearPendingEditAction={canvasState.handleClearPendingEdit}
            />
            <RightPanel />
          </div>
        </main>
      </div>
    </div>
  );
}