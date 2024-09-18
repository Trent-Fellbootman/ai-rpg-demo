"use client";

import React, { useState } from "react";
import { Textarea } from "@nextui-org/input";
import { Spacer } from "@nextui-org/spacer";
import { Button } from "@nextui-org/button";
import { Link } from "@nextui-org/link";

import { getScenePlayPagePath } from "@/app/lib/utils/path";
import {
  createNextSceneAction,
  CreateNextSceneActionResponse,
} from "@/app/lib/actions";

export default function ActionInputForm({
  userId,
  sessionId,
  sceneIndex,
  onNextSceneGenerationResponse,
}: {
  userId: number;
  sessionId: number;
  sceneIndex: number;
  onNextSceneGenerationResponse?: (
    response: CreateNextSceneActionResponse,
  ) => void;
}) {
  const isFirstScene = sceneIndex === 0;

  const [responseState, setResponseState] = useState<
    CreateNextSceneActionResponse | undefined
  >(undefined);
  const [isProcessingAction, setIsProcessingAction] = useState<boolean>(false);
  const [action, setAction] = useState<string>("");

  // Adjusted formAction to be callable without an event
  const formAction = async (event?: React.FormEvent<HTMLFormElement>) => {
    if (event) {
      event.preventDefault();
    }

    setIsProcessingAction(true);
    setResponseState(undefined);

    const formData = new FormData();

    formData.set("action", action);

    const response = await createNextSceneAction(userId, sessionId, formData);

    if (response.nextScene) {
      setAction(""); // Clear the input field after successful action
    }

    setResponseState(response);
    setIsProcessingAction(false);

    onNextSceneGenerationResponse?.(response);
  };

  // Handle key down events in the Textarea
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.ctrlKey) {
      event.preventDefault(); // Prevents adding a new line
      void formAction(); // Call the form submission function
    }
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
            value={action}
            onChange={(e) => setAction(e.target.value)}
            onKeyDown={handleKeyDown} // Attach the handler here
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
            href={getScenePlayPagePath(sessionId, sceneIndex - 1)}
            isDisabled={isFirstScene}
          >
            Previous Scene
          </Button>
        </div>
      </div>
    </form>
  );
}
