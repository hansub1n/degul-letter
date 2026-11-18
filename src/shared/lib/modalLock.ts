// 모달이 하나라도 열려 있으면 뒤 화면(마을) 조작을 멈춘다.
// PixelDialog가 열리고 닫힐 때마다 카운트를 올리고 내린다.
// 우체통 → 편지처럼 같은 턴에 창만 바뀌어도, 풀기는 마이크로태스크로 미뤄 잠금이 빈틈없이 유지된다.

type Listener = (locked: boolean) => void;

let count = 0;
let unlockScheduled = false;
const listeners = new Set<Listener>();

function notify(locked: boolean) {
  for (const fn of listeners) fn(locked);
}

function isInDialog(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest("[role='dialog']"));
}

function onBackgroundWheel(e: WheelEvent) {
  if (isInDialog(e.target)) return;
  e.preventDefault();
}

function onBackgroundTouchMove(e: TouchEvent) {
  if (isInDialog(e.target)) return;
  e.preventDefault();
}

function onGesture(e: Event) {
  e.preventDefault();
}

let pageGuards = false;

function applyScrollLock(locked: boolean) {
  document.documentElement.classList.toggle("modal-lock", locked);
  if (locked && !pageGuards) {
    document.addEventListener("wheel", onBackgroundWheel, { passive: false, capture: true });
    document.addEventListener("touchmove", onBackgroundTouchMove, { passive: false, capture: true });
    document.addEventListener("gesturestart", onGesture, { passive: false, capture: true });
    document.addEventListener("gesturechange", onGesture, { passive: false, capture: true });
    pageGuards = true;
  } else if (!locked && pageGuards) {
    document.removeEventListener("wheel", onBackgroundWheel, true);
    document.removeEventListener("touchmove", onBackgroundTouchMove, true);
    document.removeEventListener("gesturestart", onGesture, true);
    document.removeEventListener("gesturechange", onGesture, true);
    pageGuards = false;
  }
}

/** 지금 모달이 하나라도 열려 있는지 */
export function isModalLocked(): boolean {
  return count > 0;
}

/** 모달이 열리면 호출하고, 닫힐 때 반환된 함수를 부른다 */
export function acquireModalLock(): () => void {
  if (count === 0) {
    applyScrollLock(true);
    notify(true);
  }
  count += 1;
  return () => {
    count = Math.max(0, count - 1);
    if (count > 0 || unlockScheduled) return;
    unlockScheduled = true;
    queueMicrotask(() => {
      unlockScheduled = false;
      if (count !== 0) return;
      applyScrollLock(false);
      notify(false);
    });
  };
}

/** 잠금이 걸리고 풀릴 때 알림을 받는다. 구독 해제 함수를 반환한다 */
export function onModalLockChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
