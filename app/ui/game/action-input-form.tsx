"use client";

import React, { useState } from "react";
import { Textarea } from "@nextui-org/input";
import { Spacer } from "@nextui-org/spacer";
import { Button } from "@nextui-org/button";
import { Link } from "@nextui-org/link";

import {
  generateNextSceneAction,
  GenerateNextSceneActionResponse,
} from "@/app/lib/generate-next-scene";
import { getScenePagePath } from "@/app/lib/utils/path";

export default function ActionInputForm({
  userId,
  sessionId,
  sceneIndex,
  onNextSceneGenerationResponse,
}: {
  userId: string;
  sessionId: string;
  sceneIndex: number;
  onNextSceneGenerationResponse?: (
    response: GenerateNextSceneActionResponse,
  ) => void;
}) {
  const isFirstScene = sceneIndex === 0;

  const [responseState, setResponseState] = useState<
    GenerateNextSceneActionResponse | undefined
  >(undefined);
  const [isProcessingAction, setIsProcessingAction] = useState<boolean>(false);
  const [action, setAction] = useState<string>(""); // State for the input value

  const formAction = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setIsProcessingAction(true);
    setResponseState(undefined);

    const formData = new FormData(event.currentTarget);
    const response = await generateNextSceneAction(userId, sessionId, formData);

    if (response.nextScene) {
      setAction(""); // Clear the input field after successful action
    }

    setResponseState(response);
    setIsProcessingAction(false);

    onNextSceneGenerationResponse?.(response);
  };

  return (
    <form onSubmit={formAction}>
      <div className="flex flex-row items-center">
        <div className="flex flex-col flex-1">
          <Textarea
            label="Action"
            maxRows={6}
            minRows={3}
            name="action"
            placeholder="Describe what you would like to do"
            value={action} // Bind value to state
            onChange={(e) => setAction(e.target.value)} // Update state on input change
          />
          {responseState?.errors?.fieldErrors && (
            <p className="text-red-500">
              {responseState.errors.fieldErrors.action}
            </p>
          )}
          {responseState?.errors?.message && (
            <p className="text-red-500">{responseState.errors.message}</p>
          )}
        </div>
        <Spacer x={1} />
        <div className="flex flex-col gap-2">
          <Button color="primary" isLoading={isProcessingAction} type="submit">
            Take Action
          </Button>
          <Button
            as={Link}
            color="secondary"
            href={getScenePagePath(sessionId, sceneIndex - 1)}
            isDisabled={isFirstScene}
          >
            Previous Scene
          </Button>
        </div>
      </div>
    </form>
  );
}
