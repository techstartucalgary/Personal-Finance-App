let lastDirection: "left" | "right" | null = null;

export function setSwipeDirection(direction: "left" | "right") {
  lastDirection = direction;
}

export function consumeSwipeDirection() {
  const direction = lastDirection;
  lastDirection = null;
  return direction;
}
