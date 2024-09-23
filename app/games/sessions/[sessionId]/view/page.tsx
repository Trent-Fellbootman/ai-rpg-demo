import { SessionDisplayView } from "@/app/ui/game/session-display-view/session-display-view";
import { getCurrentUser } from "@/app/lib/database-actions/user-actions";

export default async function Page({
  params: { sessionId },
}: {
  params: { sessionId: string };
}) {
  const user = await getCurrentUser();

  return (
    <div className="flex justify-center">
      <div className="w-full max-w-xl">
        <SessionDisplayView sessionId={parseInt(sessionId)} userId={user.id} />
      </div>
    </div>
  );
}
