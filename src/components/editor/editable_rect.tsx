"use client";

import Konva from "konva";
import { useEffect, useRef } from "react";
import { Rect, Transformer } from "react-konva";

import { resolveThemeValue, type VisualRectElement } from "@/schema/visual_scene";

type EditableRectProps = {
  element: VisualRectElement;
  isSelected: boolean;
  onSelectAction: () => void;
  onChangeAction: (element: VisualRectElement) => void;
};

export function EditableRect({
  element,
  isSelected,
  onSelectAction,
  onChangeAction,
}: EditableRectProps) {
  const shapeRef = useRef<Konva.Rect>(null);
  const transformerRef = useRef<Konva.Transformer>(null);

  useEffect(() => {
    if (!isSelected || !shapeRef.current || !transformerRef.current) {
      return;
    }

    transformerRef.current.nodes([shapeRef.current]);
    transformerRef.current.getLayer()?.batchDraw();
  }, [isSelected]);

  return (
    <>
      <Rect
        ref={shapeRef}
        x={element.x}
        y={element.y}
        width={element.width}
        height={element.height}
        fill={resolveThemeValue(element.fill)}
        stroke={element.stroke ? resolveThemeValue(element.stroke) : undefined}
        strokeWidth={element.strokeWidth}
        cornerRadius={element.cornerRadius}
        draggable
        onMouseDown={(event) => {
          event.cancelBubble = true;
          onSelectAction();
        }}
        onTap={(event) => {
          event.cancelBubble = true;
          onSelectAction();
        }}
        onDragEnd={() => {
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
          const node = shapeRef.current;

          if (!node) {
            return;
          }

          const width = Math.max(48, node.width() * node.scaleX());
          const height = Math.max(48, node.height() * node.scaleY());

          node.scaleX(1);
          node.scaleY(1);

          onChangeAction({
            ...element,
            x: node.x(),
            y: node.y(),
            width,
            height,
          });
        }}
      />

      {isSelected ? (
        <Transformer
          ref={transformerRef}
          rotateEnabled={false}
          flipEnabled={false}
          anchorFill={resolveThemeValue("--surface-card")}
          anchorStroke={resolveThemeValue("--accent")}
          borderStroke={resolveThemeValue("--accent")}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 48 || newBox.height < 48) {
              return oldBox;
            }

            return newBox;
          }}
        />
      ) : null}
    </>
  );
}
