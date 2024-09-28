"use client";

import { Image } from "@nextui-org/image";
import { Spacer } from "@nextui-org/spacer";
import { Card, CardBody } from "@nextui-org/card";
import parse from "html-react-parser";
import React, { useRef, useState } from "react";
import { Skeleton } from "@nextui-org/skeleton";
import { Textarea } from "@nextui-org/input";
import { Button } from "@nextui-org/button";
import { Link } from "@nextui-org/link";

import { SceneViewInitialData } from "@/app/lib/actions";
import ActionDisplayView from "@/app/ui/game/action-display-view";
import { constants, getScenePlayPagePath } from "@/app/lib/utils/path";
import { GenerateNextSceneDataInProgressUpdate } from "@/app/lib/data-generation/generate-next-scene-data";

type EventData = {
  error?: string;
  inProgressUpdateEvent?: GenerateNextSceneDataInProgressUpdate;
};

export default function SceneViewClient({
  sessionId,
  initialData,
}: {
  sessionId: number;
  initialData: SceneViewInitialData;
}) {
  const [sceneIndex, setSceneIndex] = useState<number>(initialData.sceneIndex);
  const [sessionLength, setSessionLength] = useState<number>(
    initialData.sessionLength,
  );
  const [isProcessingAction, setIsProcessingAction] = useState<boolean>(false);
  const [imageUrl, setImageUrl] = useState<string | undefined>(
    initialData.imageUrl,
  );
  const [narration, setNarration] = useState<string | undefined>(
    initialData.narration,
  );
  const [proposedActions, setProposedActions] = useState<string[] | undefined>(
    initialData.proposedActions,
  );
  const [action, setAction] = useState<string>("");
  const [error, setError] = useState<string | undefined>(undefined);

  const intermediateUpdateEventSource = useRef<EventSource | null>(null);

  function onActionFinishProcessing() {
    setSceneIndex(sceneIndex + 1);
    setSessionLength(sessionLength + 1);
    setAction("");
    setIsProcessingAction(false);
  }

  const takeAction = (action: string) => {
    setIsProcessingAction(true);
    setImageUrl(undefined);
    setProposedActions(undefined);
    setNarration(undefined);
    const params = new URLSearchParams({
      sessionId: sessionId.toString(),
      action: action,
    });

    intermediateUpdateEventSource.current?.close();
    intermediateUpdateEventSource.current = new EventSource(
      `${constants.generateNextSceneApiPath}?${params.toString()}`,
    );

    intermediateUpdateEventSource.current.onmessage = (event) => {
      const parsedData = JSON.parse(event.data);
      const data = parsedData as EventData;

      updateUIFromUpdateEvent(data);
    };

    intermediateUpdateEventSource.current.onerror = (error) => {
      // close the event source and avoid retrying on internal error or
      // normal closing when no more events are available
      // (also triggering `onerror` according to ChatGPT)
      intermediateUpdateEventSource.current?.close();
    };
  };

  function updateUIFromUpdateEvent({
    error,
    inProgressUpdateEvent,
  }: EventData) {
    if (error) {
      setError(error);
    } else {
      setError(undefined);
    }

    if (inProgressUpdateEvent) {
      switch (inProgressUpdateEvent.type) {
        case "ImageUrl":
          setImageUrl(inProgressUpdateEvent.data.imageUrl);
          break;
        case "NarrationChunk":
          setNarration((previousNarration) => {
            return (previousNarration ?? "") + inProgressUpdateEvent.data.chunk;
          });
          break;
        case "ProposedActionUpdate":
          setProposedActions(inProgressUpdateEvent.data.proposedActions);
          break;
        case "Finish":
          onActionFinishProcessing();
          break;
        default:
          const exhaustiveCheck: never = inProgressUpdateEvent; // This line ensures all cases are handled

          throw new Error(`Unhandled case: ${exhaustiveCheck}`);
      }
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.ctrlKey) {
      event.preventDefault(); // Prevents adding a new line

      if (!isProcessingAction) {
        takeAction(action);
      }
    }
  };

  return (
    <div className="w-full max-w-3xl">
      {imageUrl ? (
        <Image
          alt="Scene image"
          className="rounded-xl"
          height={768}
          src={imageUrl}
          style={{
            width: "100%",
            height: "auto",
          }}
          width={1024}
        />
      ) : (
        <Skeleton>
          <div
            className="w-full aspect-square"
            style={{
              aspectRatio: "4/3",
            }}
          />
        </Skeleton>
      )}
      <Spacer y={2} />
      {narration && (
        <Card>
          <CardBody>
            <div className="flex flex-col space-y-1">{parse(narration)}</div>
          </CardBody>
        </Card>
      )}
      <Spacer y={2} />
      {sceneIndex === sessionLength - 1 ? (
        <Card>
          <CardBody>
            <div className="flex flex-col">
              {proposedActions && proposedActions.length > 0 && (
                <div className="gap-2 grid grid-cols-2">
                  {proposedActions.map((action, index) => (
                    <Card
                      key={index}
                      className="bg-content3"
                      isHoverable={!isProcessingAction}
                      isPressable={!isProcessingAction}
                      onPress={() => {
                        setAction(action);
                        takeAction(action);
                      }}
                    >
                      <CardBody>
                        <p className="text-small">{action}</p>
                      </CardBody>
                    </Card>
                  ))}
                </div>
              )}
              <Spacer y={2} />
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  takeAction(action);
                }}
              >
                <div className="flex flex-row items-center">
                  <div className="flex flex-col flex-1">
                    <Textarea
                      isReadOnly={isProcessingAction}
                      label="Action"
                      maxRows={6}
                      minRows={3}
                      name="action"
                      placeholder="Describe what you would like to do"
                      value={action}
                      onChange={(e) => setAction(e.target.value)}
                      onKeyDown={handleKeyDown} // Attach the handler here
                    />
                    {error && <p className="text-red-500">{error}</p>}
                  </div>
                  <Spacer x={1} />
                  <div className="flex flex-col gap-2">
                    <Button
                      color="primary"
                      isLoading={isProcessingAction}
                      type="submit"
                    >
                      Take Action
                    </Button>
                    <Button
                      as={Link}
                      color="secondary"
                      href={getScenePlayPagePath(sessionId, sceneIndex - 1)}
                      isDisabled={sceneIndex === 0}
                    >
                      Previous Scene
                    </Button>
                  </div>
                </div>
              </form>
            </div>
          </CardBody>
        </Card>
      ) : (
        <ActionDisplayView
          action={initialData.action ?? ""}
          sceneIndex={sceneIndex}
          sessionId={sessionId}
        />
      )}
    </div>
  );
}
