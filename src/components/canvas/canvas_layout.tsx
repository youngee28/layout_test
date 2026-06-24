"use client";

import { CenterPanel } from "@/components/canvas/panels/center_panel";
import { EditorPanel } from "@/components/canvas/panels/editor_panel";
import { InspectorPanel } from "@/components/canvas/panels/inspector_panel";
import { useCanvasState } from "@/components/canvas/store/use_canvas_state";

export function CanvasLayout() {
  const canvasState = useCanvasState();

  return (
    <div className="relative isolate h-dvh flex flex-col overflow-hidden px-4 py-4 sm:px-6 sm:py-6 lg:px-6 lg:py-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(circle_at_top,var(--glow-hero),transparent_58%)]" />
      <div className="pointer-events-none absolute inset-y-20 right-0 w-72 bg-[radial-gradient(circle,var(--glow-side),transparent_66%)] blur-3xl" />

      <div className="relative flex flex-1 min-h-0 items-stretch justify-stretch">
        <main className="flex w-full flex-col gap-8 rounded-[var(--radius-shell)] border border-[var(--border-subtle)] bg-[var(--surface-shell)] p-4 shadow-[var(--shadow-soft)] backdrop-blur-xl sm:p-5 lg:p-6 h-full overflow-hidden">
          <div className="grid flex-1 min-h-0 grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_680px_minmax(0,1fr)]">
            <InspectorPanel
              resolvedTables={canvasState.resolvedTables}
              chartRecommendations={canvasState.chartRecommendations}
              dashboardCandidates={canvasState.dashboardCandidates}
            />
            <CenterPanel
              scene={canvasState.scene}
              sceneKey={canvasState.sceneKey}
              selectedElementId={canvasState.selectedElementId}
              pendingEditId={canvasState.pendingEditId}
              errorMessage={canvasState.errorMessage}
              generationStage={canvasState.generationStage}
              onSelectElement={canvasState.setSelectedElementId}
              onChangeElement={canvasState.handleChangeElement}
              onClearSelection={() => canvasState.setSelectedElementId(null)}
              onClearPendingEditAction={canvasState.handleClearPendingEdit}
            />
            <EditorPanel
              selectedTextElement={canvasState.selectedTextElement}
              onChange={canvasState.handleTextChange}
              onDelete={canvasState.handleDeleteElement}
              onUndo={canvasState.handleUndo}
              canUndo={canvasState.canUndo}
              onAddText={canvasState.handleAddText}
              sceneAvailable={Boolean(canvasState.scene)}
              generationStage={canvasState.generationStage}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
