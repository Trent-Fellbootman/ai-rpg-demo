import GameSessionOverview from "@/app/ui/game/game-session-overview";
import { getCurrentUser } from "@/app/lib/database-actions/user-actions";

export default async function Page({
  params: { sessionId },
}: {
  params: { sessionId: string };
}) {
  const user = await getCurrentUser();

  return (
    <div className="flex justify-center">
      <div className="max-w-2xl">
        <GameSessionOverview sessionId={parseInt(sessionId)} userId={user.id} />
      </div>
    </div>
  );
}
