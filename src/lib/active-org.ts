import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import {
  getActiveOrgIdFromCookieValue,
  pickActiveMembership,
  type ActiveOrgMembership,
  type OrganizationRelation,
  unwrapOrganization,
} from "@/lib/active-org-core";

export const ACTIVE_ORG_COOKIE = "skylos_active_org";

type ActiveOrgCookieStore = {
  get(name: string): { value: string } | undefined;
  set(
    name: string,
    value: string,
    options?: {
      httpOnly?: boolean;
      sameSite?: "lax" | "strict" | "none";
      secure?: boolean;
      path?: string;
      maxAge?: number;
    }
  ): void;
};

export type ActiveOrgContext<TOrganization = unknown> = {
  membership: ActiveOrgMembership<TOrganization> | null;
  memberships: ActiveOrgMembership<TOrganization>[];
  orgId: string | null;
};

type ResolveActiveOrgOptions = {
  cookieStore?: ActiveOrgCookieStore;
  preferredOrgId?: string | null;
  requiredOrgId?: string | null;
  select?: string;
};

const ACTIVE_ORG_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export {
  pickActiveMembership,
  unwrapOrganization,
  type ActiveOrgMembership,
  type OrganizationRelation,
};

export function getActiveOrgIdFromCookie(
  cookieStore?: Pick<ActiveOrgCookieStore, "get">
): string | null {
  return getActiveOrgIdFromCookieValue(
    cookieStore?.get(ACTIVE_ORG_COOKIE)?.value
  );
}

export function setActiveOrgCookie(
  cookieStore: ActiveOrgCookieStore,
  orgId: string
): void {
  cookieStore.set(ACTIVE_ORG_COOKIE, orgId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ACTIVE_ORG_COOKIE_MAX_AGE,
  });
}

export function applyActiveOrgCookie(
  response: NextResponse,
  orgId: string
): NextResponse {
  response.cookies.set(ACTIVE_ORG_COOKIE, orgId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ACTIVE_ORG_COOKIE_MAX_AGE,
  });

  return response;
}

export async function listOrganizationMemberships<TOrganization = unknown>(
  supabase: SupabaseClient,
  userId: string,
  select = "org_id, role"
): Promise<ActiveOrgMembership<TOrganization>[]> {
  const { data, error } = await supabase
    .from("organization_members")
    .select(select)
    .eq("user_id", userId);

  if (error) {
    throw error;
  }

  return ((data || []) as unknown as ActiveOrgMembership<TOrganization>[]).sort(
    (left, right) => left.org_id.localeCompare(right.org_id)
  );
}

export async function resolveActiveOrganization<TOrganization = unknown>(
  supabase: SupabaseClient,
  userId: string,
  options: ResolveActiveOrgOptions = {}
): Promise<ActiveOrgContext<TOrganization>> {
  const memberships = await listOrganizationMemberships<TOrganization>(
    supabase,
    userId,
    options.select
  );
  const preferredOrgId =
    options.requiredOrgId ||
    options.preferredOrgId ||
    getActiveOrgIdFromCookie(options.cookieStore);
  const membership = pickActiveMembership(memberships, {
    preferredOrgId,
    requiredOrgId: options.requiredOrgId,
  });

  return {
    membership,
    memberships,
    orgId: membership?.org_id ?? null,
  };
}

export async function resolveActiveOrganizationForRequest<
  TOrganization = unknown,
>(
  supabase: SupabaseClient,
  userId: string,
  options: Omit<ResolveActiveOrgOptions, "cookieStore"> = {}
): Promise<ActiveOrgContext<TOrganization>> {
  const cookieStore = await cookies();
  return resolveActiveOrganization<TOrganization>(supabase, userId, {
    ...options,
    cookieStore,
  });
}
