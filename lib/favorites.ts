"use client";

export interface FavoriteItem {
  id: string; // stable key, e.g. "anime:toradora"
  type: "anime" | "movie";
  title: string;
  note?: string;
  savedAt: string; // ISO
}

const KEY = "marquee:favorites";

function readAll(): FavoriteItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as FavoriteItem[]) : [];
  } catch {
    return [];
  }
}

function writeAll(items: FavoriteItem[]) {
  window.localStorage.setItem(KEY, JSON.stringify(items));
  // Let other components on the page (e.g. a header counter) react without
  // a shared state library.
  window.dispatchEvent(new CustomEvent("marquee:favorites-changed"));
}

export function getFavorites(): FavoriteItem[] {
  return readAll().sort((a, b) => (a.savedAt < b.savedAt ? 1 : -1));
}

export function isFavorite(id: string): boolean {
  return readAll().some((f) => f.id === id);
}

export function addFavorite(item: Omit<FavoriteItem, "savedAt">): void {
  const all = readAll();
  if (all.some((f) => f.id === item.id)) return;
  writeAll([...all, { ...item, savedAt: new Date().toISOString() }]);
}

export function removeFavorite(id: string): void {
  writeAll(readAll().filter((f) => f.id !== id));
}

export function toggleFavorite(item: Omit<FavoriteItem, "savedAt">): boolean {
  if (isFavorite(item.id)) {
    removeFavorite(item.id);
    return false;
  }
  addFavorite(item);
  return true;
}
