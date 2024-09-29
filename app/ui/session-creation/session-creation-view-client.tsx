"use client";

import { Card, CardBody } from "@nextui-org/card";
import { Spacer } from "@nextui-org/spacer";
import React, { ReactNode } from "react";
import { Button } from "@nextui-org/button";
import { Spinner } from "@nextui-org/spinner";
import { Tooltip } from "@nextui-org/tooltip";
import { InfoIcon } from "@nextui-org/shared-icons";
import { Textarea } from "@nextui-org/input";
import { Checkbox } from "@nextui-org/checkbox";

import {
  createNewGameSessionAction,
  CreateNewGameSessionActionError,
} from "@/app/lib/actions";

export default function SessionCreationViewClient({
  sampleSetups,
}: {
  sampleSetups: {
    name: string;
    description?: string;
    backstory: string;
  }[];
}) {
  const [errorState, setErrorState] = React.useState<
    CreateNewGameSessionActionError | undefined
  >(undefined);
  const [canCreateSession, setCanCreateSession] = React.useState<boolean>(true);

  const formAction = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setCanCreateSession(false);
    setErrorState(undefined);

    const formData = new FormData(event.currentTarget);

    formData.set("save_as_template", saveAsTemplate ? "true" : "false");
    formData.set("make_template_public", makeTemplatePublic ? "true" : "false");

    const response = await createNewGameSessionAction(formData);

    setErrorState(response);
    setCanCreateSession(true);
  };

  const [sessionName, setSessionName] = React.useState<string>("");
  const [sessionDescription, setSessionDescription] =
    React.useState<string>("");
  const [backstory, setBackStory] = React.useState<string>("");
  const [saveAsTemplate, setSaveAsTemplate] = React.useState<boolean>(true);
  const [makeTemplatePublic, setMakeTemplatePublic] =
    React.useState<boolean>(true);

  return (
    <div className="flex flex-col space-y-4 w-full">
      {/* Title */}
      <p className="text-center text-3xl">Create a new session</p>
      <div className="flex flex-col sm:flex-row space-x-4 w-full">
        {/* Sample setups */}
        <div className="flex flex-col rounded-xl bg-content1 p-4 w-full sm:max-w-sm">
          <p className="text-xl font-bold text-center">
            Try these example setups!
          </p>
          <Spacer y={2} />
          <div className="max-h-32 sm:max-h-full overflow-scroll">
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
                    setBackStory(item.backstory);
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
                value={backstory}
                onChange={(e) => setBackStory(e.target.value)}
              />
              {errorState?.fieldErrors?.back_story &&
                errorState?.fieldErrors.back_story.map((error: string) => (
                  <p key={error} className="mt-2 text-sm text-red-500">
                    {error}
                  </p>
                ))}
              <div className="flex gap-4">
                <Checkbox
                  isSelected={saveAsTemplate}
                  name="save_as_template"
                  onValueChange={setSaveAsTemplate}
                >
                  <div className="flex flex-row items-center">
                    <p>Save as template</p>
                    <StyledTooltip
                      placement="top"
                      tooltipContent={
                        <div className="flex flex-col max-w-lg space-y-1">
                          <p>
                            A template consists of name, backstory and
                            description, and can be reused to create other game
                            sessions with the same background setup.
                          </p>
                          <p>
                            If selected, a game template will be created from
                            the information you provided.
                          </p>
                        </div>
                      }
                    />
                  </div>
                </Checkbox>
                <Checkbox
                  isDisabled={!saveAsTemplate}
                  isSelected={makeTemplatePublic}
                  name="make_template_public"
                  onValueChange={setMakeTemplatePublic}
                >
                  <div className="flex flex-row items-center">
                    <p>Make template public</p>
                    <StyledTooltip
                      placement="top"
                      tooltipContent={
                        <div className="flex flex-col max-w-lg space-y-1">
                          <p>
                            If selected, other people will be able to view and
                            use this template to create their own game sessions.
                          </p>
                          <p>
                            Still, they will <strong>not</strong> be able to
                            view your game sessions.
                          </p>
                        </div>
                      }
                    />
                  </div>
                </Checkbox>
              </div>
              <Button
                className="w-full"
                color="primary"
                isLoading={!canCreateSession}
                type="submit"
              >
                {canCreateSession ? "Create Session" : <Spinner />}
              </Button>
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
        <StyledTooltip placement="right" tooltipContent={fieldTooltipContent} />
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

function StyledTooltip({
  tooltipContent,
  placement,
}: {
  tooltipContent: ReactNode | string;
  placement: "top" | "right";
}) {
  return (
    <Tooltip
      showArrow
      color="primary"
      content={tooltipContent}
      placement={placement}
    >
      <Button isIconOnly size="sm" variant="light">
        <InfoIcon />
      </Button>
    </Tooltip>
  );
}
