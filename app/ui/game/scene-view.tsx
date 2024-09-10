import Image from "next/image";
import { Spacer } from "@nextui-org/spacer";
import { Card, CardBody } from "@nextui-org/card";
import parse from "html-react-parser";

import ActionInputForm from "@/app/ui/game/action-input-form";
import { getCurrentUser } from "@/app/lib/utils";
import { getSessionLength, retrieveScene } from "@/app/lib/data/apis";

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
      ? (await getSessionLength(sessionId as string)) - 1
      : parseInt(sceneIndex as string);

  // TODO: retrieve session metadata as well
  const [scene] = await Promise.all([
    retrieveScene(user.userId, sessionId as string, parsedIndex),
  ]);

  return (
    <div className="max-w-3xl">
      <Image
        alt="Picture of the author"
        className="rounded-xl"
        height={672}
        sizes="100vw"
        src={scene.imageUrl}
        style={{
          width: "100%",
          height: "auto",
        }}
        width={1008}
      />
      <Spacer y={2} />
      <Card>
        <CardBody>{parse(scene.text)}</CardBody>
      </Card>
      <Spacer y={2} />
      <ActionInputForm />
    </div>
  );
}
