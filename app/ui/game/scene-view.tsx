"use client";

import { Image } from "@nextui-org/image";
import { Spacer } from "@nextui-org/spacer";
import { Card, CardBody } from "@nextui-org/card";
import parse from "html-react-parser";
import { useEffect, useState } from "react";
import { Spinner } from "@nextui-org/spinner";

import {
  CreateNextSceneActionResponse,
  getSceneViewInitialData,
} from "@/app/lib/actions";
import ActionInputForm from "@/app/ui/game/action-input-form";
import ActionDisplayView from "@/app/ui/game/action-display-view";

export default function SceneView({
  sessionId,
  sceneIndex,
}: {
  sessionId: number;
  sceneIndex: "last" | number;
}) {
  const [widgetData, setWidgetData] = useState<
    | {
        userId: number;
        sceneIndex: number;
        sessionLength: number;
        imageUrl: string;
        imageDescription: string;
        narration: string;
        action: string | null;
        proposedActions: string[];
      }
    | undefined
  >(undefined);

  useEffect(() => {
    const initialSetData = async () => {
      setWidgetData(await getSceneViewInitialData(sessionId, sceneIndex));
    };

    // this promise is deliberately not awaited
    void initialSetData();
  }, []);

  const onNextSceneGenerationResponse = (
    response: CreateNextSceneActionResponse,
  ) => {
    if (response.nextScene) {
      setWidgetData({
        userId: widgetData!.userId,
        imageUrl: response!.nextScene!.imageUrl,
        narration: response!.nextScene!.narration,
        imageDescription: response!.nextScene!.imageUrl,
        action: "",
        proposedActions: response!.nextScene!.proposedActions,
        sceneIndex: widgetData!.sceneIndex + 1,
        sessionLength: widgetData!.sessionLength + 1,
      });
    }
  };

  return widgetData === undefined ? (
    <div className="flex items-center justify-center">
      <Spinner />
    </div>
  ) : (
    <div className="max-w-3xl">
      <Image
        alt="Picture of the author"
        className="rounded-xl"
        height={1024}
        sizes="100vw"
        src={widgetData!.imageUrl}
        style={{
          width: "100%",
          height: "auto",
        }}
        width={1024}
      />
      <Spacer y={2} />
      <Card>
        <CardBody>
          <div className="flex flex-col space-y-1">
            {parse(widgetData!.narration)}
          </div>
        </CardBody>
      </Card>
      <Spacer y={2} />
      {widgetData!.sceneIndex === widgetData!.sessionLength - 1 ? (
        <ActionInputForm
          proposedActions={widgetData.proposedActions}
          sceneIndex={widgetData!.sceneIndex}
          sessionId={sessionId}
          userId={widgetData!.userId}
          onNextSceneGenerationResponse={onNextSceneGenerationResponse}
        />
      ) : (
        <ActionDisplayView
          action={widgetData!.action!}
          sceneIndex={widgetData!.sceneIndex}
          sessionId={sessionId}
        />
      )}
    </div>
  );
}
