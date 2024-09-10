"use client";

import React, { useState } from "react";
import { Textarea } from "@nextui-org/input";
import { Spacer } from "@nextui-org/spacer";
import { Button } from "@nextui-org/button";

import { Errors, generateNextScene } from "@/app/lib/generate-next-scene";

export default function ActionInputForm({
  userId,
  sessionId,
}: {
  userId: string;
  sessionId: string;
}) {
  const [errorState, setErrorState] = useState<Errors | undefined>({});
  const [isProcessingAction, setIsProcessingAction] = useState<boolean>(false);
  const [action, setAction] = useState<string>(""); // State for the input value

  const formAction = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setIsProcessingAction(true);
    setErrorState(undefined);

    const formData = new FormData(event.currentTarget);
    const response = await generateNextScene(userId, sessionId, formData);

    if (!response) {
      setAction(""); // Clear the input field after successful action
    }

    setErrorState(response);
    setIsProcessingAction(false);
  };

  return (
    <form onSubmit={formAction}>
      <div className="flex flex-row items-center">
        <div className="flex flex-col flex-1">
          <Textarea
            label="Action"
            maxRows={5}
            minRows={2}
            name="action"
            placeholder="Describe what you would like to do"
            value={action} // Bind value to state
            onChange={(e) => setAction(e.target.value)} // Update state on input change
          />
          {errorState?.fieldErrors && (
            <p className="text-red-500">{errorState.fieldErrors.action}</p>
          )}
        </div>
        <Spacer x={1} />
        <Button color="primary" isLoading={isProcessingAction} type="submit">
          Take Action
        </Button>
      </div>
    </form>
  );
}
