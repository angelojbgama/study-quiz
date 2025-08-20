// Leitner (dias por caixa)
export const BOX_INTERVALS_DAYS = { 1:1, 2:2, 3:4, 4:7, 5:15 };

export function nextBox(currentBox, isCorrect) {
  if (isCorrect) return Math.min(5, (currentBox || 1) + 1);
  return 1;
}

export function nextDueAt(box) {
  const days = BOX_INTERVALS_DAYS[box] || 1;
  const now = Date.now();
  return now + days * 24 * 60 * 60 * 1000;
}
