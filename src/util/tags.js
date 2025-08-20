export function parseTags(raw) {
  if (!raw) return [];
  return Array.from(new Set(String(raw)
    .split(/[,;#|/]/g)
    .map(s => s.trim())
    .filter(Boolean)));
}

export function hasAnyTag(raw, selectedSet) {
  if (!selectedSet || selectedSet.size === 0) return true;
  const tags = parseTags(raw).map(t => t.toLowerCase());
  for (const t of tags) if (selectedSet.has(t.toLowerCase())) return true;
  return false;
}

export function distinctTagsFromQuestions(questions) {
  const set = new Set();
  for (const q of questions || []) {
    for (const t of parseTags(q.tags)) set.add(t);
  }
  return Array.from(set).sort((a,b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

export function tagCounts(questions) {
  const counts = {};
  for (const q of questions || []) {
    for (const t of parseTags(q.tags)) {
      counts[t] = (counts[t] || 0) + 1;
    }
  }
  return counts;
}
