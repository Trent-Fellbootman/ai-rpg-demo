"use client";

import { Card, CardBody } from "@nextui-org/card";
import { Spacer } from "@nextui-org/spacer";
import React, { ReactNode, useState } from "react";
import { Button } from "@nextui-org/button";
import { Spinner } from "@nextui-org/spinner";
import { Tooltip } from "@nextui-org/tooltip";
import { InfoIcon } from "@nextui-org/shared-icons";
import { Textarea } from "@nextui-org/input";
import { Checkbox } from "@nextui-org/checkbox";
import { Image } from "@nextui-org/image";

import {
  createNewGameSessionAction,
  CreateNewGameSessionActionError,
  generateAiImageAction,
} from "@/app/lib/actions";

export default function GameTemplateEditViewClient({
  userId,
  templateId,
  sampleSetups,
  prefilledFields = {},
}: {
  userId: number;
  templateId?: number;
  sampleSetups: {
    name: string;
    description?: string;
    backstory: string;
  }[];
  prefilledFields?: {
    name?: string;
    description?: string;
    backstory?: string;
    coverImageUrl?: string;
    coverImageDescription?: string;
    firstSceneData?: {
      imageUrl?: string;
      imageDescription?: string;
      event?: string;
      narration?: string;
      proposedActions?: string[];
    };
  };
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

    formData.set("make_template_public", makeTemplatePublic ? "true" : "false");

    const response = await createNewGameSessionAction(formData);

    setErrorState(response);
    setCanCreateSession(true);
  };

  const [sessionName, setSessionName] = React.useState<string>(
    prefilledFields.name ?? "",
  );
  const [sessionDescription, setSessionDescription] = React.useState<string>(
    prefilledFields.description ?? "",
  );
  const [backstory, setBackstory] = React.useState<string>(
    prefilledFields.backstory ?? "",
  );
  const [makeTemplatePublic, setMakeTemplatePublic] =
    React.useState<boolean>(true);
  const [coverImageDescription, setCoverImageDescription] = useState<string>(
    prefilledFields.coverImageDescription ?? "",
  );
  const [coverImageUrl, setCoverImageUrl] = useState<string | undefined>(
    prefilledFields.coverImageUrl,
  );
  const [firstSceneImageUrl, setFirstSceneImageUrl] = useState<
    string | undefined
  >(prefilledFields.firstSceneData?.imageUrl);
  const [firstSceneImageDescription, setFirstSceneImageDescription] =
    useState<string>(prefilledFields.firstSceneData?.imageDescription ?? "");
  const [firstSceneEvent, setFirstSceneEvent] = useState<string>(
    prefilledFields.firstSceneData?.event ?? "",
  );
  const [firstSceneNarration, setFirstSceneNarration] = useState<string>(
    prefilledFields.firstSceneData?.narration ?? "",
  );
  const [firstSceneProposedActions, setFirstSceneProposedActions] = useState<
    string[]
  >(prefilledFields.firstSceneData?.proposedActions ?? []);

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
                    setBackstory(item.backstory);
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
        {/* Template Info Form */}
        <div className="flex-grow">
          <form onSubmit={formAction}>
            <div className="space-y-2 flex-col w-full">
              {/* Metadata */}
              <>
                <p className="text-2xl">Template Metadata</p>
                <div className="flex flex-col flex-grow space-y-2">
                  <FormField
                    fieldDisplayName="Name"
                    fieldSerializeName="name"
                    fieldTooltipContent="The name of the game session."
                    maxRows={1}
                    minRows={1}
                    value={sessionName}
                    onValueChange={(value) => setSessionName(value)}
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
                          Will be visible to the public if you publish your
                          game.
                        </p>
                      </div>
                    }
                    maxRows={8}
                    minRows={3}
                    value={sessionDescription}
                    onValueChange={(value) => setSessionDescription(value)}
                  />
                  <div className="flex flex-col space-y-2">
                    <div className="flex flex-row justify-start">
                      <p className="text-large">Cover Image</p>
                      <StyledTooltip
                        placement="right"
                        tooltipContent="The cover image."
                      />
                    </div>
                    <ImageEditView
                      imageDescription={coverImageDescription}
                      imageUrl={coverImageUrl}
                      onImageDescriptionChange={(value) => {
                        setCoverImageDescription(value);
                      }}
                      onSuccessfulGeneration={(imageUrl) => {
                        setCoverImageUrl(imageUrl);
                      }}
                    />
                  </div>
                </div>
                <FormField
                  fieldDisplayName="Backstory"
                  fieldSerializeName="back_story"
                  fieldTooltipContent={
                    <div className="max-w-md flex flex-col space-y-1">
                      <p>The background story.</p>
                      <p>
                        May include character setup, world setup, storyline,
                        plot, etc.
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
                  onValueChange={(value) => setBackstory(value)}
                />
                {errorState?.fieldErrors?.back_story &&
                  errorState?.fieldErrors.back_story.map((error: string) => (
                    <p key={error} className="mt-2 text-sm text-red-500">
                      {error}
                    </p>
                  ))}
              </>
              {/* Initial Scene */}
              <>
                <p className="text-2xl">Initial Scene</p>
                <FormField
                  fieldDisplayName="Oracle Event"
                  fieldSerializeName="oracleEvent"
                  fieldTooltipContent={
                    <div className="max-w-lg w-full flex flex-col space-y-1">
                      <p>
                        The oracle event lists everything happening the game
                        world in the initial scene, including both what the
                        player can and cannot perceive.
                      </p>
                      <p>
                        Oracle events are invisible to the player but affect how
                        later scenes are generated by AI.
                      </p>
                    </div>
                  }
                  maxRows={8}
                  minRows={3}
                  value={firstSceneEvent}
                  onValueChange={(value) => setFirstSceneEvent(value)}
                />
                {/* TODO: Handle HTML formatting */}
                <FormField
                  fieldDisplayName="Narration"
                  fieldSerializeName="narration"
                  fieldTooltipContent={
                    <div className="max-w-lg w-full flex flex-col space-y-1">
                      <p>
                        Narration is the text that the player sees in each
                        scene.
                      </p>
                    </div>
                  }
                  maxRows={8}
                  minRows={3}
                  value={firstSceneNarration}
                  onValueChange={(value) => setFirstSceneNarration(value)}
                />
                <div className="flex flex-col space-y-2">
                  <div className="flex flex-row justify-start">
                    <p className="text-large">Scene Image</p>
                    <StyledTooltip
                      placement="right"
                      tooltipContent="A scene image is the image that the player sees in a scene."
                    />
                  </div>
                  <ImageEditView
                    imageDescription={firstSceneImageDescription}
                    imageUrl={firstSceneImageUrl}
                    onImageDescriptionChange={(value) =>
                      setFirstSceneImageDescription(value)
                    }
                    onSuccessfulGeneration={(imageUrl) =>
                      setFirstSceneImageUrl(imageUrl)
                    }
                  />
                </div>
              </>
              <Checkbox
                isSelected={makeTemplatePublic}
                name="make_template_public"
                onValueChange={setMakeTemplatePublic}
              >
                <div className="flex flex-row items-center">
                  <p>Public Template</p>
                  <StyledTooltip
                    placement="top"
                    tooltipContent={
                      <div className="flex flex-col max-w-lg space-y-1">
                        <p>
                          If selected, other people will be able to view and use
                          this template to create their own game sessions.
                        </p>
                        <p>
                          Still, they will <strong>not</strong> be able to view
                          your game sessions.
                        </p>
                      </div>
                    }
                  />
                </div>
              </Checkbox>
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
  onValueChange,
}: {
  fieldDisplayName: string;
  fieldSerializeName: string;
  fieldTooltipContent: ReactNode | string;
  minRows: number;
  maxRows: number;
  value: string;
  onValueChange: (value: string) => void;
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
        onValueChange={onValueChange}
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

function ImageEditView({
  imageUrl,
  imageDescription,
  onImageDescriptionChange,
  onSuccessfulGeneration,
}: {
  imageUrl?: string;
  imageDescription: string;
  onImageDescriptionChange?: (value: string) => void;
  onSuccessfulGeneration?: (imageUrl: string) => void;
}) {
  const [inProgress, setInProgress] = useState<boolean>(false);
  const [error, setError] = useState<string | undefined>(undefined);

  const generateImage = async () => {
    setInProgress(true);
    setError(undefined);

    const result = await generateAiImageAction({
      prompt: imageDescription,
    });

    if (result.imageUrl) {
      onSuccessfulGeneration?.(result.imageUrl);
    }
    if (result.error) {
      setError(result.error);
    }

    setInProgress(false);
  };

  return (
    <div className="flex flex-row space-x-2">
      <div className="flex flex-col space-y-2 flex-grow">
        <Textarea
          label="Image Description"
          value={imageDescription}
          onValueChange={onImageDescriptionChange}
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <Button
          color="primary"
          isLoading={inProgress}
          variant="solid"
          onPress={async (e) => {
            await generateImage();
          }}
        >
          Regenerate Image
        </Button>
      </div>
      <div className="max-w-64 sm:max-w-sm h-full">
        <Image alt={imageDescription} src={imageUrl} />
      </div>
    </div>
  );
}
