import { getSceneViewInitialData } from "@/app/lib/actions";
import SceneViewClient from "@/app/ui/game/scene-view-client";

export default async function SceneView({
  sessionId,
  sceneIndex,
}: {
  sessionId: number;
  sceneIndex: "last" | number;
}) {
  const data = await getSceneViewInitialData(sessionId, sceneIndex);

  return <SceneViewClient initialData={data} sessionId={sessionId} />;
}
