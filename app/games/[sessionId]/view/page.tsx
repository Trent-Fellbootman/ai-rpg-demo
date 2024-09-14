import { SessionDisplayView } from "@/app/ui/game/session-display-view/session-display-view";
import { getCurrentUser } from "@/app/lib/utils";

export default async function Page({
  params: { sessionId },
}: {
  params: { sessionId: string };
}) {
  const user = await getCurrentUser();

  return (
    <div className="flex justify-center">
      <div className="max-w-2xl">
        <SessionDisplayView sessionId={sessionId} userId={user.userId} />
      </div>
    </div>
  );
}
