"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      className="rounded border border-marquee-line px-3 py-2 text-sm text-marquee-textDim hover:text-marquee-text focus-ring"
    >
      Log out
    </button>
  );
}
