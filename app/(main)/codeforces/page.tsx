import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { CodeforcesUsernameForm } from "@/components/codeforces-username-form";
import { CodeforcesProfile } from "@/components/codeforces-profile";

export default async function CodeforcesPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { codeforcesUsername: true },
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold">Codeforces</h1>

      {!user?.codeforcesUsername ? (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Link your Codeforces account to view your stats, rating history,
            and contest participation.
          </p>
          <CodeforcesUsernameForm />
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          <CodeforcesProfile handle={user.codeforcesUsername} />
          <CodeforcesUsernameForm initialValue={user.codeforcesUsername} />
        </div>
      )}
    </div>
  );
}
