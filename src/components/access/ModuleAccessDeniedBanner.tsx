"use client";



import { useRouter, useSearchParams } from "next/navigation";

import { ShieldAlert, X } from "lucide-react";

import { useCallback } from "react";



export function ModuleAccessDeniedBanner() {

  const searchParams = useSearchParams();

  const router = useRouter();

  const deniedModule = searchParams.get("denied") === "module";

  const deniedPermission = searchParams.get("denied") === "permission";



  const dismiss = useCallback(() => {

    const next = new URLSearchParams(searchParams.toString());

    next.delete("denied");

    const qs = next.toString();

    router.replace(qs ? `/dashboard?${qs}` : "/dashboard");

  }, [router, searchParams]);



  if (!deniedModule && !deniedPermission) return null;



  return (

    <div

      role="alert"

      className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200/80 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100"

    >

      <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />

      <div className="flex-1 min-w-0">

        {deniedPermission ? (

          <>

            <p className="font-semibold">You don&apos;t have access to that page</p>

            <p className="mt-0.5 text-amber-900/80 dark:text-amber-100/80">

              Your role doesn&apos;t include permission for that area. Use the menu to navigate to

              pages available to you, or ask your administrator to update your role.

            </p>

          </>

        ) : (

          <>

            <p className="font-semibold">This area isn&apos;t included in your plan</p>

            <p className="mt-0.5 text-amber-900/80 dark:text-amber-100/80">

              That page isn&apos;t enabled for your tenant. Open{" "}

              <span className="font-medium">Support → Contact</span> to request access, or ask your

              platform admin to enable the module.

            </p>

          </>

        )}

      </div>

      <button

        type="button"

        onClick={dismiss}

        className="shrink-0 rounded-md p-1 text-amber-700/70 hover:bg-amber-100 hover:text-amber-900 dark:text-amber-200/70 dark:hover:bg-amber-500/20 dark:hover:text-amber-50"

        aria-label="Dismiss"

      >

        <X className="h-4 w-4" />

      </button>

    </div>

  );

}

