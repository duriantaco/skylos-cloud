export type InviteAcceptanceDecision =
  | {
      mode: "already_member";
      activeOrgId: string;
      shouldInsertMembership: false;
      redirectTo: "/dashboard/settings";
    }
  | {
      mode: "join_org";
      activeOrgId: string;
      shouldInsertMembership: true;
      redirectTo: "/dashboard/settings";
    };

export function decideInviteAcceptance(args: {
  existingOrgIds: string[];
  invitationOrgId: string;
}): InviteAcceptanceDecision {
  const { existingOrgIds, invitationOrgId } = args;

  if (existingOrgIds.includes(invitationOrgId)) {
    return {
      mode: "already_member",
      activeOrgId: invitationOrgId,
      shouldInsertMembership: false,
      redirectTo: "/dashboard/settings",
    };
  }

  return {
    mode: "join_org",
    activeOrgId: invitationOrgId,
    shouldInsertMembership: true,
    redirectTo: "/dashboard/settings",
  };
}

export function getInviteWorkspaceNotice(args: {
  existingOrgIds: string[];
  invitationOrgId: string;
}): "already_member" | "joining_additional_org" | null {
  const { existingOrgIds, invitationOrgId } = args;

  if (existingOrgIds.includes(invitationOrgId)) {
    return "already_member";
  }

  return existingOrgIds.length > 0 ? "joining_additional_org" : null;
}
