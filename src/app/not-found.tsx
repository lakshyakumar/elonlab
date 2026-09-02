"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Unmatched paths land on the home page. The redirect runs on the client rather
 * than as a 307, because the static export has no server to issue one — Pages
 * serves this as `404.html` and the router takes over from there. `replace`
 * keeps the bad URL out of the back-button history, and is basePath-aware.
 */
export default function NotFound() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/");
  }, [router]);

  return null;
}
