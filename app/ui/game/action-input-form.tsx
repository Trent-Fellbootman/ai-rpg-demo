"use client";

import React, { useState } from "react";
import { Textarea } from "@nextui-org/input";
import { Spacer } from "@nextui-org/spacer";
import { Button } from "@nextui-org/button";

import { Errors, generateNextScene } from "@/app/lib/generate-next-scene";

export default function ActionInputForm() {
  const [errorState, setErrorState] = useState<Errors | undefined>({});
  const [isProcessingAction, setIsProcessingAction] = useState<boolean>(false);

  const formAction = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setIsProcessingAction(true);
    setErrorState(undefined);

    const formData = new FormData(event.currentTarget);
    const response = await generateNextScene(formData);

    setErrorState(response.errors);
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
          />
          {errorState && <p className="text-red-500">{errorState.action}</p>}
        </div>
        <Spacer x={1} />
        <Button color="primary" isLoading={isProcessingAction} type="submit">
          Take Action
        </Button>
      </div>
    </form>
  );
}
