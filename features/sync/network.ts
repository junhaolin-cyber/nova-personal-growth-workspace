export function isNetworkOnline(): boolean {
  return typeof navigator === "undefined" ? true : navigator.onLine;
}

export function subscribeNetworkStatus(onChange: (online: boolean) => void): () => void {
  if (typeof window === "undefined") return () => undefined;

  const handleOnline = () => onChange(true);
  const handleOffline = () => onChange(false);
  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);

  return () => {
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
  };
}
