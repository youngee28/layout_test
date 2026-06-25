"use client";

import Konva from "konva";
import { useEffect, useRef } from "react";
import { Line, Transformer } from "react-konva";

import { resolveThemeValue, type VisualLineElement } from "@/schema/visual_element";

type EditableLineProps = {
  element: VisualLineElement;
  isSelected: boolean;
  onSelectAction: () => void;
  onChangeAction: (element: VisualLineElement) => void;
};

export function EditableLine({
  element,
  isSelected,
  onSelectAction,
  onChangeAction,
}: EditableLineProps) {
  const shapeRef = useRef<Konva.Line>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const points = [0, 0, element.width, 0];
  const isInteractive = element.editable !== false && element.locked !== true;

  useEffect(() => {
    if (!isSelected || !shapeRef.current || !transformerRef.current) {
      return;
    }

    transformerRef.current.nodes([shapeRef.current]);
    transformerRef.current.getLayer()?.batchDraw();
  }, [isSelected]);

  return (
    <>
      <Line
        ref={shapeRef}
        x={element.x}
        y={element.y}
        points={points}
        stroke={resolveThemeValue(element.stroke)}
        strokeWidth={element.strokeWidth}
        lineCap="round"
        hitStrokeWidth={24}
        strokeScaleEnabled={false}
        draggable={isInteractive}
        onMouseDown={(event) => {
          if (!isInteractive) {
            return;
          }

          event.cancelBubble = true;
          onSelectAction();
        }}
        onTap={(event) => {
          if (!isInteractive) {
            return;
          }

          event.cancelBubble = true;
          onSelectAction();
        }}
        onDragEnd={() => {
          if (!isInteractive) {
            return;
          }

          const node = shapeRef.current;

          if (!node) {
            return;
          }

          onChangeAction({
            ...element,
            x: node.x(),
            y: node.y(),
          });
        }}
        onTransformEnd={() => {
          if (!isInteractive) {
            return;
          }

          const node = shapeRef.current;

          if (!node) {
            return;
          }

          const width = Math.max(1, element.width * node.scaleX());

          node.scaleX(1);
          node.scaleY(1);

          onChangeAction({
            ...element,
            x: node.x(),
            y: node.y(),
            width,
          });
        }}
      />

      {isSelected && isInteractive ? (
        <Transformer
          ref={transformerRef}
          rotateEnabled={false}
          flipEnabled={false}
          enabledAnchors={["middle-left", "middle-right"]}
          anchorFill={resolveThemeValue("--surface-card")}
          anchorStroke={resolveThemeValue("--accent")}
          borderStroke={resolveThemeValue("--accent")}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 1) {
              return oldBox;
            }

            return newBox;
          }}
        />
      ) : null}
    </>
  );
}
