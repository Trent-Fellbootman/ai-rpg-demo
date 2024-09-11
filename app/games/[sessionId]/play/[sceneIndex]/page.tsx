import SceneView from "@/app/ui/game/scene-view";

export default async function Page({
  params: { sessionId, sceneIndex },
}: {
  params: { sessionId: string; sceneIndex: string };
}) {
  return (
    <div className="flex items-center w-full justify-center">
      <SceneView sceneIndex={sceneIndex} sessionId={sessionId} />
    </div>
  );
}
