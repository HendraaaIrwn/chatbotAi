import { DashboardClient } from "@/components/dashboard-client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const memberships = await prisma.projectMember.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      role: true,
      project: {
        select: {
          id: true,
          name: true,
          description: true,
          updatedAt: true,
        },
      },
    },
  });

  return (
    <DashboardClient
      initialUser={user}
      initialProjects={memberships.map((membership) => ({
        ...membership.project,
        role: membership.role,
        updatedAt: membership.project.updatedAt.toISOString(),
      }))}
    />
  );
}
