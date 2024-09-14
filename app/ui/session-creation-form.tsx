"use client";

import { Input, Textarea } from "@nextui-org/input";
import { Spacer } from "@nextui-org/spacer";
import { Button } from "@nextui-org/button";
import React from "react";
import { Spinner } from "@nextui-org/spinner";

import { createSession, Errors } from "@/app/lib/create-session";
import {
  defaultStoryName,
  defaultBackStory,
} from "@/content/default-session-setup";

export default function SessionCreationForm() {
  const [errorState, setErrorState] = React.useState<Errors | undefined>(
    undefined,
  );
  const [canCreateSession, setCanCreateSession] = React.useState<boolean>(true);

  const formAction = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setCanCreateSession(false);
    setErrorState(undefined);

    const formData = new FormData(event.currentTarget);
    const response = await createSession(formData);

    setErrorState(response);
    setCanCreateSession(true);
  };

  return (
    <div className="max-w-xl w-full">
      <form onSubmit={formAction}>
        <p className="text-center text-3xl">Create a session</p>
        <Spacer y={2} />
        <p className="text-large">Name</p>
        <Spacer y={2} />
        <Input
          defaultValue={defaultStoryName}
          label="Session Name"
          name="name"
        />
        {errorState?.fieldErrors?.name &&
          errorState?.fieldErrors.name.map((error: string) => (
            <p key={error} className="mt-2 text-sm text-red-500">
              {error}
            </p>
          ))}
        <Spacer y={2} />
        <p className="text-large">Back Story</p>
        <Spacer y={2} />
        <Textarea
          defaultValue={defaultBackStory}
          label="Back Story"
          name="back_story"
        />
        {errorState?.fieldErrors?.back_story &&
          errorState?.fieldErrors.back_story.map((error: string) => (
            <p key={error} className="mt-2 text-sm text-red-500">
              {error}
            </p>
          ))}
        <Spacer y={4} />
        <Button
          className="w-full"
          color="primary"
          isLoading={!canCreateSession}
          type="submit"
        >
          {canCreateSession ? "Create Session" : <Spinner />}
        </Button>
        {errorState?.message && (
          <p className="text-red-500">{errorState.message}</p>
        )}
      </form>
    </div>
  );
}
