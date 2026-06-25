"use client";

import Konva from "konva";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { Text, Transformer } from "react-konva";

import { resolveThemeValue, type VisualTextElement } from "@/schema/visual_element";

type EditableTextProps = {
  element: VisualTextElement;
  isSelected: boolean;
  onSelectAction: () => void;
  onChangeAction: (element: VisualTextElement) => void;
  shouldAutoEdit?: boolean;
  onClearPendingEditAction?: () => void;
};

export function EditableText({
  element,
  isSelected,
  onSelectAction,
  onChangeAction,
  shouldAutoEdit,
  onClearPendingEditAction,
}: EditableTextProps) {
  const textRef = useRef<Konva.Text>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const [draft, setDraft] = useState(element.text);
  const [isEditing, setIsEditing] = useState(false);
  const [textareaStyle, setTextareaStyle] = useState<CSSProperties | null>(null);
  const isInteractive = element.editable !== false && element.locked !== true;

  const startEditing = useCallback(() => {
    if (!isInteractive) {
      return;
    }

    const node = textRef.current;
    const stage = node?.getStage();

    if (!node || !stage) {
      return;
    }

    const containerRect = stage.container().getBoundingClientRect();
    const position = node.getAbsoluteTransform().point({ x: 0, y: 0 });
    const absoluteScale = node.getAbsoluteScale();

    setDraft(element.text);
    setTextareaStyle({
      position: "fixed",
      top: containerRect.top + position.y,
      left: containerRect.left + position.x,
      width: Math.max(120 * absoluteScale.x, node.width() * absoluteScale.x),
      minHeight: node.height() * absoluteScale.y,
      padding: `${8 * absoluteScale.y}px ${10 * absoluteScale.x}px`,
      margin: 0,
      border: "1px solid var(--border-strong)",
      borderRadius: `${16 * absoluteScale.y}px`,
      outline: "none",
      resize: "none",
      overflow: "hidden",
      background: "var(--surface-card)",
      color: "var(--text-primary)",
      boxShadow: "var(--shadow-card)",
      fontFamily: "var(--font-geist-sans), sans-serif",
      fontSize: `${element.fontSize * absoluteScale.y}px`,
      fontWeight: element.fontStyle === "bold" ? "700" : "400",
      lineHeight: "1.2",
      zIndex: 1000,
    });
    setIsEditing(true);
  }, [element, isInteractive]);

  useEffect(() => {
    if (!isSelected || isEditing || !textRef.current || !transformerRef.current) {
      return;
    }

    transformerRef.current.nodes([textRef.current]);
    transformerRef.current.getLayer()?.batchDraw();
  }, [isEditing, isSelected]);

  useEffect(() => {
    if (!isEditing || !textareaStyle) {
      return;
    }

    const textarea = document.createElement("textarea");
    textarea.value = draft;
    Object.assign(textarea.style, {
      ...textareaStyle,
      height: "auto",
    });

    const resize = () => {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    };

    let didExit = false;

    const finish = () => {
      if (didExit) {
        return;
      }

      didExit = true;
      const nextText = textarea.value;

      onChangeAction({
        ...element,
        text: nextText,
      });
      setDraft(nextText);
      setIsEditing(false);
      setTextareaStyle(null);
    };

    const cancel = () => {
      if (didExit) {
        return;
      }

      didExit = true;
      setDraft(element.text);
      setIsEditing(false);
      setTextareaStyle(null);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.isComposing) {
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        cancel();
        return;
      }

      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        finish();
      }
    };

    const handleOutsideClick = (event: MouseEvent) => {
      if (event.target !== textarea) {
        finish();
      }
    };

    textarea.addEventListener("input", resize);
    textarea.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleOutsideClick);

    document.body.appendChild(textarea);

    const frameId = window.requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(textarea.value.length, textarea.value.length);
      resize();
    });

    return () => {
      window.cancelAnimationFrame(frameId);
      textarea.removeEventListener("input", resize);
      textarea.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleOutsideClick);

      if (textarea.isConnected) {
        textarea.remove();
      }
    };
  }, [draft, element, isEditing, onChangeAction, textareaStyle]);

  useEffect(() => {
    if (!isSelected || isEditing) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        startEditing();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSelected, isEditing, startEditing]);

  useEffect(() => {
    if (!shouldAutoEdit || isEditing || !isSelected || !isInteractive) {
      return;
    }

    const timer = setTimeout(() => {
      startEditing();
      if (onClearPendingEditAction) {
        onClearPendingEditAction();
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [shouldAutoEdit, isSelected, isEditing, isInteractive, startEditing, onClearPendingEditAction]);

  return (
    <>
      <Text
        ref={textRef}
        x={element.x}
        y={element.y}
        text={element.text}
        width={element.width}
        fontSize={element.fontSize}
        fontStyle={element.fontStyle}
        fontFamily={resolveThemeValue(element.fontFamily, "sans-serif")}
        fill={resolveThemeValue(element.fill)}
        align={element.align ?? "left"}
        lineHeight={1.2}
        draggable={isInteractive}
        visible={!isEditing}
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
        onDblClick={(event) => {
          if (!isInteractive) {
            return;
          }

          event.cancelBubble = true;
          onSelectAction();
          startEditing();
        }}
        onDblTap={(event) => {
          if (!isInteractive) {
            return;
          }

          event.cancelBubble = true;
          onSelectAction();
          startEditing();
        }}
        onDragEnd={() => {
          if (!isInteractive) {
            return;
          }

          const node = textRef.current;

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

          const node = textRef.current;

          if (!node) {
            return;
          }

          const width = Math.max(1, node.width() * node.scaleX());

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

      {isSelected && !isEditing && isInteractive ? (
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
