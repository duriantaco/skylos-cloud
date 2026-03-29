export type OrganizationRelation<TOrganization> =
  | TOrganization
  | TOrganization[]
  | null
  | undefined;

export type ActiveOrgMembership<TOrganization = unknown> = {
  org_id: string;
  role?: string | null;
  organizations?: OrganizationRelation<TOrganization>;
};

export function unwrapOrganization<TOrganization>(
  value: OrganizationRelation<TOrganization>
): TOrganization | null {
  if (!value) {
    return null;
  }

  return Array.isArray(value) ? value[0] ?? null : value;
}

export function pickActiveMembership<TOrganization>(
  memberships: ActiveOrgMembership<TOrganization>[],
  options: {
    preferredOrgId?: string | null;
    requiredOrgId?: string | null;
  } = {}
): ActiveOrgMembership<TOrganization> | null {
  const orderedMemberships = [...memberships].sort((left, right) =>
    left.org_id.localeCompare(right.org_id)
  );

  if (orderedMemberships.length === 0) {
    return null;
  }

  if (options.requiredOrgId) {
    return (
      orderedMemberships.find(
        (membership) => membership.org_id === options.requiredOrgId
      ) ?? null
    );
  }

  if (options.preferredOrgId) {
    const preferredMembership = orderedMemberships.find(
      (membership) => membership.org_id === options.preferredOrgId
    );

    if (preferredMembership) {
      return preferredMembership;
    }
  }

  return orderedMemberships[0] ?? null;
}

export function getActiveOrgIdFromCookieValue(
  value: string | null | undefined
): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}
