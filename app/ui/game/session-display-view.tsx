import { Card, CardBody } from "@nextui-org/card";
import { Suspense } from "react";
import { Skeleton } from "@nextui-org/skeleton";
import { Spacer } from "@nextui-org/spacer";
import { Image } from "@nextui-org/image";

import {
  createTemporaryUrl,
  getSessionLength,
  retrieveScene,
} from "@/app/lib/data/apis";

/**
 * Widget to display an entire session.
 */
export async function SessionDisplayView({
  userId,
  sessionId,
}: {
  userId: string;
  sessionId: string;
}) {
  // TODO: right now we're not checking session lock status here.
  const sessionLength = await getSessionLength(sessionId);

  return (
    <div className="space-y-2.5">
      {Array.from({ length: sessionLength }, (_, index) => (
        <Suspense
          key={index}
          fallback={
            <Card shadow="sm">
              <Skeleton className="w-full object-cover aspect-square" />
              <Spacer y={2} />
              <Skeleton className="w-4/5 rounded-lg">
                <div className="h-5 w-4/5 rounded-lg bg-default-200" />
              </Skeleton>
              <Spacer y={2} />
            </Card>
          }
        >
          <SceneView sceneIndex={index} sessionId={sessionId} userId={userId} />
        </Suspense>
      ))}
    </div>
  );
}

async function SceneView({
  userId,
  sessionId,
  sceneIndex,
}: {
  userId: string;
  sessionId: string;
  sceneIndex: number;
}) {
  const sceneData = await retrieveScene(userId, sessionId, sceneIndex);
  const imageUrl = await createTemporaryUrl(sceneData.imageStoragePath);
  const text = sceneData.text;
  const action = sceneData.action === "" ? null : sceneData.action;

  return (
    <DialogCard firstText={text} imageUrl={imageUrl} secondText={action} />
  );
}

function DialogCard({
  imageUrl,
  firstText,
  secondText,
}: {
  imageUrl: string;
  firstText: string;
  secondText: string | null;
}) {
  return (
    <Card className="w-full p-4 shadow-lg">
      <CardBody>
        <div className="flex justify-center">
          <Image alt="Card Image" className="w-full" src={imageUrl} />
        </div>
        <div className="flex flex-col space-y-4 mt-4">
          {/* First text bubble aligned to the left */}
          <div className="flex justify-start">
            <div className="bg-primary px-4 py-2 rounded-xl relative text-white">
              <p>{firstText}</p>
            </div>
            <Spacer x={10} />
          </div>
          {/* Second text bubble aligned to the right */}
          {secondText && (
            <div className="flex justify-end">
              <Spacer x={10} />
              <div className="bg-secondary px-4 py-2 rounded-xl relative text-white">
                <p>{secondText}</p>
              </div>
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
