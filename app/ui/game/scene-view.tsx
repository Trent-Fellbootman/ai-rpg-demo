"use client";

import { Image } from "@nextui-org/image";
import { Spacer } from "@nextui-org/spacer";
import { Card, CardBody } from "@nextui-org/card";
import parse from "html-react-parser";
import { useEffect, useState } from "react";
import { Spinner } from "@nextui-org/spinner";

import { getSceneViewInitialData } from "@/app/lib/actions";
import { GenerateNextSceneActionResponse } from "@/app/lib/data-generation/generate-next-scene-data";
import ActionInputForm from "@/app/ui/game/action-input-form";
import ActionDisplayView from "@/app/ui/game/action-display-view";

export default function SceneView({
  sessionId,
  sceneIndex,
}: {
  sessionId: string;
  sceneIndex: string;
}) {
  const [widgetData, setWidgetData] = useState<
    | {
        userId: string;
        imageUrl: string;
        text: string;
        action: string;
        currentSceneIndex: number;
        currentSessionLength: number;
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
    response: GenerateNextSceneActionResponse,
  ) => {
    if (response.nextScene) {
      setWidgetData({
        userId: widgetData!.userId,
        imageUrl: response!.nextScene!.imageUrl,
        text: response!.nextScene!.text,
        action: "",
        currentSceneIndex: widgetData!.currentSceneIndex + 1,
        currentSessionLength: widgetData!.currentSessionLength + 1,
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
            {parse(widgetData!.text)}
          </div>
        </CardBody>
      </Card>
      <Spacer y={2} />
      {widgetData!.currentSceneIndex ===
      widgetData!.currentSessionLength - 1 ? (
        <ActionInputForm
          sceneIndex={widgetData!.currentSceneIndex}
          sessionId={sessionId}
          userId={widgetData!.userId}
          onNextSceneGenerationResponse={onNextSceneGenerationResponse}
        />
      ) : (
        <ActionDisplayView
          action={widgetData!.action}
          sceneIndex={widgetData!.currentSceneIndex}
          sessionId={sessionId}
        />
      )}
    </div>
  );
}
