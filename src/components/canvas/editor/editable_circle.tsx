"use client";

import Konva from "konva";
import { useEffect, useRef } from "react";
import { Circle, Transformer } from "react-konva";

import { resolveThemeValue, type VisualCircleElement } from "@/schema/visual_element";

type EditableCircleProps = {
  element: VisualCircleElement;
  isSelected: boolean;
  onSelectAction: () => void;
  onChangeAction: (element: VisualCircleElement) => void;
};

export function EditableCircle({
  element,
  isSelected,
  onSelectAction,
  onChangeAction,
}: EditableCircleProps) {
  const shapeRef = useRef<Konva.Circle>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
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
      <Circle
        ref={shapeRef}
        x={element.x}
        y={element.y}
        radius={element.radius}
        fill={resolveThemeValue(element.fill)}
        stroke={element.stroke ? resolveThemeValue(element.stroke) : undefined}
        strokeWidth={element.strokeWidth}
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

          const radius = Math.max(0.5, element.radius * Math.max(node.scaleX(), node.scaleY()));

          node.scaleX(1);
          node.scaleY(1);

          onChangeAction({
            ...element,
            x: node.x(),
            y: node.y(),
            radius,
          });
        }}
      />

      {isSelected && isInteractive ? (
        <Transformer
          ref={transformerRef}
          rotateEnabled={false}
          flipEnabled={false}
          keepRatio
          enabledAnchors={["top-left", "top-right", "bottom-left", "bottom-right"]}
          anchorFill={resolveThemeValue("--surface-card")}
          anchorStroke={resolveThemeValue("--accent")}
          borderStroke={resolveThemeValue("--accent")}
          boundBoxFunc={(oldBox, newBox) => {
            if (Math.min(newBox.width, newBox.height) < 1) {
              return oldBox;
            }

            return newBox;
          }}
        />
      ) : null}
    </>
  );
}
