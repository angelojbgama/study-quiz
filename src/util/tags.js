// src/util/tags.js
export function parseTags(tags) {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags.map((t) => String(t).trim()).filter(Boolean);
  return String(tags)
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}

export function distinctTagsFromQuestions(list = []) {
  const set = new Set();
  list.forEach((q) => parseTags(q.tags).forEach((t) => set.add(t)));
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

export function tagCounts(list = []) {
  const counts = {};
  list.forEach((q) => parseTags(q.tags).forEach((t) => { counts[t] = (counts[t] || 0) + 1; }));
  return counts;
}
