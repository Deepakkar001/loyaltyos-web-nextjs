export interface NavItemDto {
  href: string;
  label: string;
  iconKey: string;
  moduleKey: string;
  requiresOnboardingComplete: boolean;
}

export interface NavGroupDto {
  label: string;
  items: NavItemDto[];
}

export interface RouteGuardDto {
  path: string;
  permissionKey: string;
}

export interface MeAccessResponse {
  tenantId: string;
  tenantUserId: string;
  sessionVersion: number;
  permissions: string[];
  entitledModules: string[];
  navGroups: NavGroupDto[];
  routeGuards?: RouteGuardDto[];
  modulesConfigured: boolean;
  dynamicNavEnabled: boolean;
}

export interface ModuleCatalogItemDto {
  moduleKey: string;
  displayName: string;
  description?: string;
  required: boolean;
  inTierBaseline?: boolean;
  preSelected?: boolean;
  locked?: boolean;
  enabled?: boolean;
  entitlementSource?: string;
}

export interface ModuleCatalogResponse {
  tier: string;
  required: string[];
  tierBaseline: string[];
  modules: ModuleCatalogItemDto[];
  modulesConfigured: boolean;
}

export interface RoleResponse {
  roleId: string;
  roleName: string;
  description?: string;
  system: boolean;
  templateKey?: string;
}

export interface RoleTemplateResponse {
  templateKey: string;
  roleName: string;
  description?: string;
}

export interface TenantUserResponse {
  userId: string;
  email: string;
  fullName?: string;
  status: string;
  mustChangePassword?: boolean;
  roleIds: string[];
  inviteToken?: string;
  inviteEmailSent?: boolean;
}

export interface PrivilegeRowDto {
  moduleKey: string;
  moduleName: string;
  navSection: string;
  actionKey: string;
  permissionKey: string;
  assignable: boolean;
  selected: boolean;
  inheritedFromRole: boolean;
  denied: boolean;
}

export interface PrivilegeMatrixResponse {
  roleId: string;
  userId?: string;
  actionKeys: string[];
  rows: PrivilegeRowDto[];
}
