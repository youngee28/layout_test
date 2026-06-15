import { Layer, Rect } from "react-konva";

import { EditableCircle } from "@/components/canvas/editor/editable_circle";
import { EditableLine } from "@/components/canvas/editor/editable_line";
import { EditableRect } from "@/components/canvas/editor/editable_rect";
import { EditableText } from "@/components/canvas/editor/editable_text";
import {
  resolveThemeValue,
  type VisualElement,
  type VisualScene,
} from "@/schema/visual_scene";

type KonvaRendererProps = {
  scene: VisualScene;
  selectedElementId: string | null;
  onSelectElementAction: (elementId: string) => void;
  onChangeElementAction: (element: VisualElement) => void;
  onClearSelectionAction: () => void;
  pendingEditId?: string | null;
  onClearPendingEditAction?: () => void;
};

export function KonvaRenderer({
  scene,
  selectedElementId,
  onSelectElementAction,
  onChangeElementAction,
  onClearSelectionAction,
  pendingEditId,
  onClearPendingEditAction,
}: KonvaRendererProps) {
  return (
    <Layer>
      <Rect
        x={0}
        y={0}
        width={scene.width}
        height={scene.height}
        fill={resolveThemeValue(scene.background, "#ffffff")}
        onMouseDown={onClearSelectionAction}
        onTap={onClearSelectionAction}
      />

      {scene.elements.map((element) => {
        const isSelected = selectedElementId === element.id;

        switch (element.type) {
          case "text":
            return (
              <EditableText
                key={element.id}
                element={element}
                isSelected={isSelected}
                onSelectAction={() => onSelectElementAction(element.id)}
                onChangeAction={onChangeElementAction}
                shouldAutoEdit={pendingEditId === element.id}
                onClearPendingEditAction={onClearPendingEditAction}
              />
            );

          case "rect":
            return (
              <EditableRect
                key={element.id}
                element={element}
                isSelected={isSelected}
                onSelectAction={() => onSelectElementAction(element.id)}
                onChangeAction={onChangeElementAction}
              />
            );

          case "line":
            return (
              <EditableLine
                key={element.id}
                element={element}
                isSelected={isSelected}
                onSelectAction={() => onSelectElementAction(element.id)}
                onChangeAction={onChangeElementAction}
              />
            );

          case "circle":
            return (
              <EditableCircle
                key={element.id}
                element={element}
                isSelected={isSelected}
                onSelectAction={() => onSelectElementAction(element.id)}
                onChangeAction={onChangeElementAction}
              />
            );

          default:
            return null;
        }
      })}
    </Layer>
  );
}
