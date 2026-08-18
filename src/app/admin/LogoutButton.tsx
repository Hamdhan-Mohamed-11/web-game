"use client";

import { useRouter } from "next/navigation";
import Button from "@/components/shared/Button";

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <Button variant="outline" onClick={handleLogout} className="px-3 py-2 text-xs">
      Log out
    </Button>
  );
}
