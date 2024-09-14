import { SessionDisplayViewClient } from "@/app/ui/game/session-display-view/session-display-view-client";
import {
  createTemporaryUrl,
  doesUserOwnSession,
  getScenes,
} from "@/app/lib/data/apis";

export async function SessionDisplayView({
  userId,
  sessionId,
}: {
  userId: string;
  sessionId: string;
}) {
  if (!(await doesUserOwnSession(userId, sessionId))) {
    throw new Error("User does not own session.");
  }

  // TODO: we're not checking lock status here

  const scenesMetadata = await getScenes(sessionId);
  const imageUrls = await Promise.all(
    scenesMetadata.map((item, _) => createTemporaryUrl(item.imageStoragePath)),
  );
  const scenes = scenesMetadata.map((item, index) => ({
    imageUrl: imageUrls[index],
    text: item.text,
    action: item.action,
  }));

  return <SessionDisplayViewClient scenes={scenes} />;
}
