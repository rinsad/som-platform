export function fileIdentity(file) {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

export function mergeSelectedFiles(currentFiles, selectedFiles) {
  const seen = new Set();
  return [...currentFiles, ...selectedFiles].filter((file) => {
    const identity = fileIdentity(file);
    if (seen.has(identity)) return false;
    seen.add(identity);
    return true;
  });
}

