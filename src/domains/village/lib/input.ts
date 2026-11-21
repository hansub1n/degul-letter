// 키보드(방향키·WASD)와 화면 드래그(가상 조이스틱)를 하나의 이동 입력으로 합친다.

import { isModalLocked, onModalLockChange } from "@/shared/lib/modalLock";
import type { InputState } from "./types";

/** 화면에 그릴 조이스틱. 좌표는 캔버스 기준 CSS 픽셀. */
export type JoystickView = { baseX: number; baseY: number; knobX: number; knobY: number };

export type GameInput = {
  read(): InputState;
  joystick(): JoystickView | null;
  destroy(): void;
};

const JOYSTICK_RADIUS = 40;
const DRAG_START_DISTANCE = 6;
/**
 * 움직이는 키는 글자(e.key)가 아니라 키보드 자리(e.code)로 본다.
 * 한글 입력 상태에서는 W·A·S·D가 ㅈ·ㅁ·ㄴ·ㅇ으로 들어와 글자로 보면 움직이지 않았다.
 */
const MOVE_KEYS = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "KeyW", "KeyA", "KeyS", "KeyD"]);

type Drag = { pointerId: number; startX: number; startY: number; dx: number; dy: number; active: boolean };

export function createInput(target: HTMLElement): GameInput {
  const pressed = new Set<string>();
  let drag: Drag | null = null;

  const releaseDrag = () => {
    if (!drag) return;
    try {
      target.releasePointerCapture(drag.pointerId);
    } catch {
      // 이미 놓인 포인터
    }
    drag = null;
  };
  const freeze = () => {
    pressed.clear();
    releaseDrag();
  };

  const onKeyDown = (e: KeyboardEvent) => {
    const key = e.code;
    if (!MOVE_KEYS.has(key)) return;
    // 모달이 열려 있으면 마을은 멈추고, 입력칸의 글자·화살표는 그대로 둔다
    if (isModalLocked()) return;
    e.preventDefault();
    pressed.add(key);
  };
  const onKeyUp = (e: KeyboardEvent) => {
    pressed.delete(e.code);
  };
  const onBlur = () => freeze();

  const localPoint = (e: PointerEvent) => {
    const rect = target.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };
  const onPointerDown = (e: PointerEvent) => {
    if (isModalLocked() || drag) return;
    const pt = localPoint(e);
    target.setPointerCapture(e.pointerId);
    drag = { pointerId: e.pointerId, startX: pt.x, startY: pt.y, dx: 0, dy: 0, active: false };
  };
  const onPointerMove = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.pointerId) return;
    const pt = localPoint(e);
    let dx = pt.x - drag.startX;
    let dy = pt.y - drag.startY;
    const len = Math.hypot(dx, dy);
    if (!drag.active && len < DRAG_START_DISTANCE) return;
    drag.active = true;
    if (len > JOYSTICK_RADIUS) {
      dx = (dx / len) * JOYSTICK_RADIUS;
      dy = (dy / len) * JOYSTICK_RADIUS;
    }
    drag.dx = dx;
    drag.dy = dy;
  };
  const onPointerEnd = (e: PointerEvent) => {
    if (drag && e.pointerId === drag.pointerId) drag = null;
  };

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onBlur);
  target.addEventListener("pointerdown", onPointerDown);
  target.addEventListener("pointermove", onPointerMove);
  target.addEventListener("pointerup", onPointerEnd);
  target.addEventListener("pointercancel", onPointerEnd);
  const stopLock = onModalLockChange((locked) => {
    if (locked) freeze();
  });
  if (isModalLocked()) freeze();

  const axis = (minus: string[], plus: string[]) =>
    (plus.some((k) => pressed.has(k)) ? 1 : 0) - (minus.some((k) => pressed.has(k)) ? 1 : 0);

  return {
    read() {
      if (isModalLocked()) return { x: 0, y: 0 };
      let x = axis(["ArrowLeft", "KeyA"], ["ArrowRight", "KeyD"]);
      let y = axis(["ArrowUp", "KeyW"], ["ArrowDown", "KeyS"]);
      if (drag?.active) {
        x += drag.dx / JOYSTICK_RADIUS;
        y += drag.dy / JOYSTICK_RADIUS;
      }
      const len = Math.hypot(x, y);
      return len > 1 ? { x: x / len, y: y / len } : { x, y };
    },
    joystick() {
      if (isModalLocked() || !drag?.active) return null;
      return { baseX: drag.startX, baseY: drag.startY, knobX: drag.startX + drag.dx, knobY: drag.startY + drag.dy };
    },
    destroy() {
      stopLock();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      target.removeEventListener("pointerdown", onPointerDown);
      target.removeEventListener("pointermove", onPointerMove);
      target.removeEventListener("pointerup", onPointerEnd);
      target.removeEventListener("pointercancel", onPointerEnd);
    },
  };
}
