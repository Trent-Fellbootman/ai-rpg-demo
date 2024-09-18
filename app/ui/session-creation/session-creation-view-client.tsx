"use client";

import { Card, CardBody } from "@nextui-org/card";
import { Spacer } from "@nextui-org/spacer";
import React, { ReactNode } from "react";
import { Button } from "@nextui-org/button";
import { Spinner } from "@nextui-org/spinner";
import { Tooltip } from "@nextui-org/tooltip";
import { InfoIcon } from "@nextui-org/shared-icons";
import { Textarea } from "@nextui-org/input";

import { generateSessionData, Errors } from "@/app/lib/data-generation/generate-session-data";

export default function SessionCreationViewClient({
  sampleSetups,
}: {
  sampleSetups: {
    name: string;
    description?: string;
    backStory: string;
  }[];
}) {
  const [errorState, setErrorState] = React.useState<Errors | undefined>(
    undefined,
  );
  const [canCreateSession, setCanCreateSession] = React.useState<boolean>(true);

  const formAction = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setCanCreateSession(false);
    setErrorState(undefined);

    const formData = new FormData(event.currentTarget);
    const response = await generateSessionData(formData);

    setErrorState(response);
    setCanCreateSession(true);
  };

  const [sessionName, setSessionName] = React.useState<string>("");
  const [sessionDescription, setSessionDescription] =
    React.useState<string>("");
  const [backStory, setBackStory] = React.useState<string>("");

  return (
    <div className="flex flex-col space-y-4 w-full">
      {/* Title */}
      <p className="text-center text-3xl">Create a new session</p>
      <div className="flex flex-row space-x-4 w-full">
        {/* Sample setups */}
        <div className="flex flex-col rounded-xl bg-content1 p-4 max-w-sm">
          <p className="text-xl font-bold text-center">
            Try these example setups!
          </p>
          <Spacer y={2} />
          <div className="flex flex-col space-y-2">
            {sampleSetups.map((item, index) => (
              <Card
                key={index}
                isHoverable
                isPressable
                className="bg-content2"
                onPress={(_) => {
                  setSessionName(item.name);
                  setSessionDescription(item.description ?? "");
                  setBackStory(item.backStory);
                }}
              >
                <CardBody>
                  <div className="flex flex-col">
                    <p className="text-large font-bold line-clamp-1">
                      {item.name}
                    </p>
                    {item.description && (
                      <p className="line-clamp-3">{item.description}</p>
                    )}
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        </div>
        {/* Session Creation Form */}
        <div className="flex-grow">
          <form onSubmit={formAction}>
            <div className="space-y-2 flex-col w-full">
              <FormField
                fieldDisplayName="Name"
                fieldSerializeName="name"
                fieldTooltipContent="The name of the game session."
                maxRows={1}
                minRows={1}
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
              />
              {errorState?.fieldErrors?.name &&
                errorState?.fieldErrors.name.map((error: string) => (
                  <p key={error} className="mt-2 text-sm text-red-500">
                    {error}
                  </p>
                ))}
              <FormField
                fieldDisplayName="Description (Optional)"
                fieldSerializeName="description"
                fieldTooltipContent={
                  <div className="max-w-md flex flex-col space-y-1">
                    <p>The &quot;trailer&quot; of the game.</p>
                    <p>Does not affect how scenes are generated.</p>
                    <p>
                      Will be visible to the public if you publish your game.
                    </p>
                  </div>
                }
                maxRows={8}
                minRows={3}
                value={sessionDescription}
                onChange={(e) => setSessionDescription(e.target.value)}
              />
              <FormField
                fieldDisplayName="Backstory"
                fieldSerializeName="back_story"
                fieldTooltipContent={
                  <div className="max-w-md flex flex-col space-y-1">
                    <p>The background story.</p>
                    <p>
                      May include character setup, world setup, storyline, plot,
                      etc.
                    </p>
                    <p>
                      The backstory guides the AI in generating scenes, and
                      experienced users can use this to adjust gameplay
                      experience and logic.
                    </p>
                    <p>
                      Will not be visible by default, as viewing it may spoil
                      the story.
                    </p>
                  </div>
                }
                maxRows={8}
                minRows={5}
                value={backStory}
                onChange={(e) => setBackStory(e.target.value)}
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
      </div>
    </div>
  );
}

function FormField({
  fieldDisplayName,
  fieldSerializeName,
  fieldTooltipContent,
  minRows,
  maxRows,
  value,
  onChange,
}: {
  fieldDisplayName: string;
  fieldSerializeName: string;
  fieldTooltipContent: ReactNode | string;
  minRows: number;
  maxRows: number;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="flex flex-col">
      <div className="flex flex-row justify-start items-center">
        <p className="text-large">{fieldDisplayName}</p>
        <Tooltip
          showArrow
          color="primary"
          content={fieldTooltipContent}
          placement="right"
        >
          <Button isIconOnly size="sm" variant="light">
            <InfoIcon />
          </Button>
        </Tooltip>
      </div>
      <Textarea
        label={fieldDisplayName}
        maxRows={maxRows}
        minRows={minRows}
        name={fieldSerializeName}
        value={value}
        onChange={onChange}
      />
    </div>
  );
}
