export function parseTags(tagsStr) {
  if (!tagsStr) return [];
  return String(tagsStr)
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

export function distinctTagsFromQuestions(qs) {
  const set = new Set();
  (qs || []).forEach(q => parseTags(q.tags).forEach(t => set.add(t)));
  return Array.from(set).sort((a,b) => a.localeCompare(b));
}

export function tagCounts(qs) {
  const map = {};
  (qs || []).forEach(q => {
    parseTags(q.tags).forEach(t => {
      map[t] = (map[t] || 0) + 1;
    });
  });
  return map;
}
