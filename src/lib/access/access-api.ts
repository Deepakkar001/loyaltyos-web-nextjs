import { apiClient } from "@/lib/api/client";
import type {
  MeAccessResponse,
  ModuleCatalogResponse,
  PrivilegeMatrixResponse,
  RoleResponse,
  RoleTemplateResponse,
  TenantUserResponse,
} from "@/types/access";

export type CreateRolePayload = { roleName: string; description?: string; templateKey?: string };
export type UpdateRolePayload = { roleName: string; description?: string };
export type ReassignUserRolePayload = { roleId: string };
export type UpdateUserPayload = { fullName?: string; roleId: string };
export type InviteUserPayload = {
  email: string;
  fullName?: string;
  roleId: string;
  temporaryPassword?: string;
};
export type LoadPrivilegesPayload = { roleId: string; userId?: string };
export type AssignPrivilegesPayload = {
  roleId: string;
  userId?: string;
  permissionKeys: string[];
};

export const accessApi = {
  getMeAccess: async (): Promise<MeAccessResponse> => {
    const res = await apiClient.get<MeAccessResponse>("/api/v1/me/access");
    return res.data;
  },

  getModuleCatalog: async (): Promise<ModuleCatalogResponse> => {
    const res = await apiClient.get<ModuleCatalogResponse>("/api/v1/onboarding/modules/catalog");
    return res.data;
  },

  saveModules: async (selectedModuleKeys: string[]): Promise<ModuleCatalogResponse> => {
    const res = await apiClient.post<ModuleCatalogResponse>("/api/v1/onboarding/modules", {
      selectedModuleKeys,
    });
    return res.data;
  },

  listRoles: async (): Promise<RoleResponse[]> => {
    const res = await apiClient.get<RoleResponse[]>("/api/v1/me/access/roles");
    return res.data;
  },

  listRoleTemplates: async (): Promise<RoleTemplateResponse[]> => {
    const res = await apiClient.get<RoleTemplateResponse[]>("/api/v1/me/access/role-templates");
    return res.data;
  },

  createRole: async (body: CreateRolePayload): Promise<RoleResponse> => {
    const res = await apiClient.post<RoleResponse>("/api/v1/me/access/roles", body);
    return res.data;
  },

  updateRole: async (roleId: string, body: UpdateRolePayload): Promise<RoleResponse> => {
    const res = await apiClient.patch<RoleResponse>(
      `/api/v1/me/access/roles/${encodeURIComponent(roleId)}`,
      body
    );
    return res.data;
  },

  deleteRole: async (roleId: string): Promise<void> => {
    await apiClient.delete(`/api/v1/me/access/roles/${encodeURIComponent(roleId)}`);
  },

  listUsers: async (): Promise<TenantUserResponse[]> => {
    const res = await apiClient.get<TenantUserResponse[]>("/api/v1/me/access/users");
    return res.data;
  },

  inviteUser: async (body: InviteUserPayload): Promise<TenantUserResponse> => {
    const res = await apiClient.post<TenantUserResponse>("/api/v1/me/access/users/invite", body);
    return res.data;
  },

  reassignUserRole: async (userId: string, body: ReassignUserRolePayload): Promise<TenantUserResponse> => {
    const res = await apiClient.patch<TenantUserResponse>(
      `/api/v1/me/access/users/${encodeURIComponent(userId)}/role`,
      body
    );
    return res.data;
  },

  updateUser: async (userId: string, body: UpdateUserPayload): Promise<TenantUserResponse> => {
    const res = await apiClient.patch<TenantUserResponse>(
      `/api/v1/me/access/users/${encodeURIComponent(userId)}`,
      body
    );
    return res.data;
  },

  disableUser: async (userId: string): Promise<void> => {
    await apiClient.post(`/api/v1/me/access/users/${encodeURIComponent(userId)}/disable`);
  },

  loadPrivileges: async (body: LoadPrivilegesPayload): Promise<PrivilegeMatrixResponse> => {
    const res = await apiClient.post<PrivilegeMatrixResponse>("/api/v1/me/access/privileges/load", body);
    return res.data;
  },

  assignPrivileges: async (body: AssignPrivilegesPayload): Promise<PrivilegeMatrixResponse> => {
    const res = await apiClient.post<PrivilegeMatrixResponse>("/api/v1/me/access/privileges/assign", body);
    return res.data;
  },
};
