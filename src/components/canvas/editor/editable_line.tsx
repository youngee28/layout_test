"use client";

import Konva from "konva";
import { useEffect, useRef } from "react";
import { Line, Transformer } from "react-konva";

import { resolveThemeValue, type VisualLineElement } from "@/schema/visual_scene";

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
  const points = element.points ?? [0, 0, element.width, 0];
  const canTransformWidthOnly = element.points === undefined;

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
          if (!canTransformWidthOnly) {
            const node = shapeRef.current;

            if (!node) {
              return;
            }

            node.scaleX(1);
            node.scaleY(1);

            onChangeAction({
              ...element,
              x: node.x(),
              y: node.y(),
            });
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

      {isSelected ? (
        <Transformer
          ref={transformerRef}
          rotateEnabled={false}
          flipEnabled={false}
          enabledAnchors={canTransformWidthOnly ? ["middle-left", "middle-right"] : []}
          anchorFill={resolveThemeValue("--surface-card")}
          anchorStroke={resolveThemeValue("--accent")}
          borderStroke={resolveThemeValue("--accent")}
          boundBoxFunc={(oldBox, newBox) => {
            if (canTransformWidthOnly && newBox.width < 1) {
              return oldBox;
            }

            return newBox;
          }}
        />
      ) : null}
    </>
  );
}
