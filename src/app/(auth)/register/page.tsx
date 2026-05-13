"use client";

import { useEffect } from "react";

/** Bookmarks to `/register` land on the home marketing page after removal of the embedded #get-started block. */
export default function RegisterPage() {
  useEffect(() => {
    window.location.replace("/");
  }, []);

  return (
    <div className="min-h-screen bg-brand-950 flex items-center justify-center p-6" role="status" aria-live="polite">
      <p className="text-brand-200 text-sm font-medium">Redirecting…</p>
    </div>
  );
}
