import Image from "next/image";
import { Spacer } from "@nextui-org/spacer";
import { Card, CardBody } from "@nextui-org/card";
import parse from "html-react-parser";

import ActionInputForm from "@/app/ui/game/action-input-form";
import { getCurrentUser } from "@/app/lib/utils";
import {
  createTemporaryUrl,
  getSessionLength,
  retrieveScene,
} from "@/app/lib/data/apis";
import ActionDisplayView from "@/app/ui/game/action-display-view";

export default async function SceneView({
  sessionId,
  sceneIndex,
}: {
  sessionId: string;
  sceneIndex: string;
}) {
  const user = (await getCurrentUser())!;

  const parsedIndex =
    sceneIndex === "last"
      ? (await getSessionLength(sessionId)) - 1
      : parseInt(sceneIndex);

  const isLastScene = parsedIndex === (await getSessionLength(sessionId)) - 1;

  // TODO: retrieve session metadata as well
  const [scene] = await Promise.all([
    retrieveScene(user.userId, sessionId, parsedIndex),
  ]);

  return (
    <div className="max-w-3xl">
      <Image
        alt="Picture of the author"
        className="rounded-xl"
        height={1024}
        sizes="100vw"
        src={await createTemporaryUrl(scene.imageStoragePath)}
        style={{
          width: "100%",
          height: "auto",
        }}
        width={1024}
      />
      <Spacer y={2} />
      <Card>
        <CardBody>{parse(scene.text)}</CardBody>
      </Card>
      <Spacer y={2} />
      {isLastScene ? (
        <ActionInputForm sessionId={sessionId} userId={user.userId} />
      ) : (
        <ActionDisplayView
          action={scene.action}
          sceneIndex={parsedIndex}
          sessionId={sessionId}
        />
      )}
    </div>
  );
}
