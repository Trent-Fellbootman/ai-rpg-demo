"use client";

import { Input, Textarea } from "@nextui-org/input";
import { Button } from "@nextui-org/button";
import React from "react";
import { Spinner } from "@nextui-org/spinner";
import { Tooltip } from "@nextui-org/tooltip";
import { InfoIcon } from "@nextui-org/shared-icons";

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
    <div className="w-full">
      <form onSubmit={formAction}>
        <div className="space-y-2">
          <p className="text-center text-3xl">Create a session</p>
          <div className="flex flex-row justify-start items-center">
            <p className="text-large">Name</p>
            <Tooltip
              showArrow
              color="primary"
              content="The name of the game session"
              placement="right"
            >
              <Button isIconOnly size="sm" variant="light">
                <InfoIcon />
              </Button>
            </Tooltip>
          </div>
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
          <div className="flex flex-row justify-start items-center">
            <p className="text-large">Description (Optional)</p>
            <Tooltip
              showArrow
              color="primary"
              content={
                <div className="max-w-md flex flex-col space-y-1">
                  <p>The &quot;trailer&quot; of the game.</p>
                  <p>Does not affect how scenes are generated.</p>
                  <p>Will be visible to the public if you publish your game.</p>
                </div>
              }
              placement="right"
            >
              <Button isIconOnly size="sm" variant="light">
                <InfoIcon />
              </Button>
            </Tooltip>
          </div>
          <Textarea label="Description (Optional)" name="description" />
          <div className="flex flex-row justify-start items-center">
            <p className="text-large">Back Story</p>
            <Tooltip
              showArrow
              color="primary"
              content={
                <div className="max-w-md flex flex-col space-y-1">
                  <p>The background story.</p>
                  <p>
                    May include character setup, world setup, storyline, plot,
                    etc.
                  </p>
                  <p>
                    The backstory guides the AI in generating scenes, and
                    experienced users can use this to adjust gameplay experience
                    and logic.
                  </p>
                  <p>
                    Will not be visible by default, as viewing it may spoil the
                    story.
                  </p>
                </div>
              }
              placement="right"
            >
              <Button isIconOnly size="sm" variant="light">
                <InfoIcon />
              </Button>
            </Tooltip>
          </div>
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
        </div>
      </form>
    </div>
  );
}
