import { z } from "zod";

export const tenantPasswordSchema = z
  .string()
  .min(12, "Password must be at least 12 characters")
  .regex(/[A-Z]/, "Include an uppercase letter")
  .regex(/[a-z]/, "Include a lowercase letter")
  .regex(/[0-9]/, "Include a number")
  .regex(/[^A-Za-z0-9]/, "Include a special character");

export function createChangePasswordSchema(email?: string) {
  return z
    .object({
      currentPassword: z.string().min(1, "Current password is required"),
      newPassword: tenantPasswordSchema,
      confirmPassword: z.string().min(1, "Confirm your new password"),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: "Passwords do not match",
      path: ["confirmPassword"],
    })
    .refine((data) => data.newPassword !== data.currentPassword, {
      message: "New password must be different from your current password",
      path: ["newPassword"],
    })
    .superRefine((data, ctx) => {
      const local = email?.split("@")[0]?.toLowerCase() ?? "";
      if (local.length >= 3 && data.newPassword.toLowerCase().includes(local)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Password must not contain your email address",
          path: ["newPassword"],
        });
      }
    });
}
