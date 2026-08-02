function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function mergeStatePatch(currentState, patch) {
  if (!isPlainObject(patch)) {
    return patch;
  }

  const result = isPlainObject(currentState) ? { ...currentState } : {};
  for (const [key, value] of Object.entries(patch)) {
    result[key] = isPlainObject(value)
      ? mergeStatePatch(result[key], value)
      : value;
  }
  return result;
}

export function listStatePatchPaths(patch, prefix = '') {
  if (!isPlainObject(patch)) {
    return prefix ? [prefix] : [];
  }

  return Object.entries(patch).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return isPlainObject(value) ? listStatePatchPaths(value, path) : [path];
  });
}
