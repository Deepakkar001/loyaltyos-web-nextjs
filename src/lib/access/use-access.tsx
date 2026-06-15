"use client";



import {

  createContext,

  useCallback,

  useContext,

  useEffect,

  useMemo,

  useState,

  type ReactNode,

} from "react";

import { accessApi } from "@/lib/access/access-api";
import { canAccessDashboardPath } from "@/lib/access/route-access";
import { SESSION_REFRESHED_EVENT } from "@/lib/auth/session-events";
import type { MeAccessResponse, NavGroupDto } from "@/types/access";
import { getAccessToken } from "@/lib/auth/session";



const DYNAMIC_NAV =

  typeof process !== "undefined" &&

  process.env.NEXT_PUBLIC_ACCESS_DYNAMIC_NAV === "true";



const ENFORCE_PERMISSIONS =

  typeof process !== "undefined" &&

  process.env.NEXT_PUBLIC_ACCESS_ENFORCE_PERMISSIONS === "true";



const SHOULD_LOAD_ACCESS = DYNAMIC_NAV || ENFORCE_PERMISSIONS;



type AccessContextValue = {

  loading: boolean;

  access: MeAccessResponse | null;

  navGroups: NavGroupDto[];

  permissions: string[];

  dynamicNavEnabled: boolean;

  permissionsEnforced: boolean;

  modulesConfigured: boolean;

  refreshAccess: () => Promise<void>;

  hasPermission: (key: string) => boolean;

  canAccessPath: (pathname: string) => boolean;

};



const AccessContext = createContext<AccessContextValue | null>(null);

const enforcementEnabled = ENFORCE_PERMISSIONS || DYNAMIC_NAV;



export function AccessProvider({ children }: { children: ReactNode }) {

  const [loading, setLoading] = useState(SHOULD_LOAD_ACCESS);

  const [access, setAccess] = useState<MeAccessResponse | null>(null);



  const refreshAccess = useCallback(async () => {

    if (!SHOULD_LOAD_ACCESS || !getAccessToken()) {

      setLoading(false);

      return;

    }

    try {

      const data = await accessApi.getMeAccess();

      setAccess(data);

    } catch {

      setAccess(null);

    } finally {

      setLoading(false);

    }

  }, []);



  useEffect(() => {
    void refreshAccess();
  }, [refreshAccess]);

  useEffect(() => {
    const onSessionRefreshed = () => {
      void refreshAccess();
    };
    window.addEventListener(SESSION_REFRESHED_EVENT, onSessionRefreshed);
    return () => window.removeEventListener(SESSION_REFRESHED_EVENT, onSessionRefreshed);
  }, [refreshAccess]);



  const permissions = useMemo(() => access?.permissions ?? [], [access?.permissions]);



  const hasPermission = useCallback(

    (key: string) => {

      if (!ENFORCE_PERMISSIONS && !DYNAMIC_NAV) {

        return true;

      }

      if (loading) {

        return false;

      }

      return permissions.includes(key);

    },

    [permissions, loading]

  );



  const canAccessPath = useCallback(

    (pathname: string) => {

      if (!enforcementEnabled) return true;

      if (loading) return false;

      const routeGuards = access?.routeGuards ?? [];

      return canAccessDashboardPath(pathname, permissions, routeGuards, {

        enforcementEnabled: true,

      });

    },

    [access?.routeGuards, permissions, loading]

  );



  const value = useMemo<AccessContextValue>(

    () => ({

      loading,

      access,

      navGroups: access?.navGroups ?? [],

      permissions,

      dynamicNavEnabled: DYNAMIC_NAV && (access?.dynamicNavEnabled ?? false),

      permissionsEnforced: ENFORCE_PERMISSIONS,

      modulesConfigured: access?.modulesConfigured ?? true,

      refreshAccess,

      hasPermission,

      canAccessPath,

    }),

    [loading, access, permissions, refreshAccess, hasPermission, canAccessPath]

  );



  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>;

}



export function useAccess(): AccessContextValue {

  const ctx = useContext(AccessContext);

  if (!ctx) {

    return {

      loading: false,

      access: null,

      navGroups: [],

      permissions: [],

      dynamicNavEnabled: false,

      permissionsEnforced: false,

      modulesConfigured: true,

      refreshAccess: async () => {},

      hasPermission: () => true,

      canAccessPath: () => true,

    };

  }

  return ctx;

}


