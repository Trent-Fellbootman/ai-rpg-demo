import { SessionDisplayViewClient } from "@/app/ui/game/session-display-view/session-display-view-client";
import {
  doesUserHaveGameSession,
  getScenesBySession,
} from "@/app/lib/database-actions/game-session-actions";

export async function SessionDisplayView({
  userId,
  sessionId,
}: {
  userId: number;
  sessionId: number;
}) {
  if (!(await doesUserHaveGameSession(userId, sessionId))) {
    throw new Error("User does not own session.");
  }

  // TODO: we're not checking lock status here

  const scenesMetadata = await getScenesBySession(userId, sessionId);

  const scenes = scenesMetadata.map((item, _) => ({
    imageUrl: item.imageUrl,
    narration: item.narration,
    action: item.action,
  }));

  return <SessionDisplayViewClient scenes={scenes} />;
}
