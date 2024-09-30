"use client";

import { Card, CardBody } from "@nextui-org/card";
import { Spacer } from "@nextui-org/spacer";
import React, { ReactNode, useState } from "react";
import { Button } from "@nextui-org/button";
import { Spinner } from "@nextui-org/spinner";
import { Tooltip } from "@nextui-org/tooltip";
import { InfoIcon } from "@nextui-org/shared-icons";
import { Input, Textarea } from "@nextui-org/input";
import { Checkbox } from "@nextui-org/checkbox";
import { Image } from "@nextui-org/image";
import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";

import {
  GameTemplateDataSubmitErrors,
  generateAiImageAction,
} from "@/app/lib/actions";
import { GameTemplateData } from "@/app/lib/database-actions/game-template-actions";
import { ErrorsDisplayView } from "@/app/ui/utils/errors-display-view";

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends (infer U)[]
    ? U extends object
      ? DeepPartial<U>[]
      : T[K]
    : T[K] extends object
      ? DeepPartial<T[K]>
      : T[K];
};

export type OptionalGameTemplateData = DeepPartial<GameTemplateData>;

export default function GameTemplateEditForm({
  sampleTemplatesData,
  prefilledFields = {},
  onSubmitForm,
  submitButtonText = "Submit",
}: {
  sampleTemplatesData: OptionalGameTemplateData[];
  prefilledFields?: OptionalGameTemplateData;
  submitButtonText?: string;
  onSubmitForm?: (
    newData: GameTemplateData,
  ) => Promise<GameTemplateDataSubmitErrors | undefined>;
}) {
  async function submitForm() {
    setSubmitInProgress(true);
    setErrors(undefined);

    const errors = await onSubmitForm?.({
      name: name,
      description: description === "" ? null : description,
      backstory: backstory,
      coverImageUrl: coverImageUrl ?? "",
      coverImageDescription: coverImageDescription,
      firstSceneData: {
        imageUrl: firstSceneImageUrl ?? "",
        imageDescription: firstSceneImageDescription,
        event: firstSceneEvent,
        narration: firstSceneNarration,
        proposedActions: firstSceneProposedActions,
      },
      publicTemplate: makeTemplatePublic,
    });

    setErrors(errors);
    setSubmitInProgress(false);
  }

  const [submitInProgress, setSubmitInProgress] = useState<boolean>(false);
  const [errors, setErrors] = useState<
    GameTemplateDataSubmitErrors | undefined
  >();
  const [name, setName] = React.useState<string>(prefilledFields.name ?? "");
  const [description, setDescription] = React.useState<string>(
    prefilledFields.description ?? "",
  );
  const [backstory, setBackstory] = React.useState<string>(
    prefilledFields.backstory ?? "",
  );
  const [makeTemplatePublic, setMakeTemplatePublic] = React.useState<boolean>(
    prefilledFields.publicTemplate ?? true,
  );
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
              {sampleTemplatesData.map((item, index) => (
                <Card
                  key={index}
                  isHoverable
                  isPressable
                  className="bg-content2"
                  onPress={(_) => {
                    setName(item.name ?? "");
                    setDescription(item.description ?? "");
                    setBackstory(item.backstory ?? "");
                    setCoverImageUrl(item.coverImageUrl);
                    setCoverImageDescription(item.coverImageDescription ?? "");
                    setFirstSceneImageUrl(item.firstSceneData?.imageUrl);
                    setFirstSceneImageDescription(
                      item.firstSceneData?.imageDescription ?? "",
                    );
                    setFirstSceneEvent(item.firstSceneData?.event ?? "");
                    setFirstSceneNarration(
                      item.firstSceneData?.narration ?? "",
                    );
                    setFirstSceneProposedActions(
                      item.firstSceneData?.proposedActions ?? [],
                    );
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
          <div className="space-y-2 flex-col w-full">
            {/* Metadata */}
            <>
              <p className="text-2xl">Template Metadata</p>
              <div className="flex flex-col flex-grow space-y-2">
                {/* Name */}
                <FormField
                  fieldDisplayName="Name"
                  fieldSerializeName="name"
                  fieldTooltipContent="The name of the game session."
                  maxRows={1}
                  minRows={1}
                  value={name}
                  onValueChange={(value) => setName(value)}
                />
                {errors?.fieldErrors?.name && (
                  <ErrorsDisplayView errors={errors.fieldErrors.name} />
                )}
                {/* Description */}
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
                  value={description}
                  onValueChange={(value) => setDescription(value)}
                />
                {errors?.fieldErrors?.description && (
                  <ErrorsDisplayView errors={errors.fieldErrors.description} />
                )}
                {/* Cover Image */}
                <div className="flex flex-col space-y-2">
                  <div className="flex flex-row justify-start items-center">
                    <p className="text-large">Cover Image</p>
                    <StyledTooltip
                      placement="right"
                      tooltipContent={
                        <div className="flex flex-col space-y-1">
                          <p>The cover image.</p>
                          <p>
                            Currently, AI image generation only supports{" "}
                            <strong>English</strong> image description.
                          </p>
                        </div>
                      }
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
                {errors?.fieldErrors?.coverImageDescription && (
                  <ErrorsDisplayView
                    errors={errors.fieldErrors.coverImageDescription}
                  />
                )}
                {errors?.fieldErrors?.coverImageUrl && (
                  <ErrorsDisplayView
                    errors={errors.fieldErrors.coverImageUrl}
                  />
                )}
              </div>
              {/* Backstory */}
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
                onValueChange={(value) => setBackstory(value)}
              />
              {errors?.fieldErrors?.backstory && (
                <ErrorsDisplayView errors={errors.fieldErrors.backstory} />
              )}
            </>
            {/* Initial Scene */}
            <>
              <p className="text-2xl">Initial Scene</p>
              {/* Oracle Event */}
              <FormField
                fieldDisplayName="Oracle Event"
                fieldSerializeName="oracleEvent"
                fieldTooltipContent={
                  <div className="max-w-lg w-full flex flex-col space-y-1">
                    <p>
                      The oracle event lists everything happening the game world
                      in the initial scene, including both what the player can
                      and cannot perceive.
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
              {errors?.fieldErrors?.firstSceneData?.event && (
                <ErrorsDisplayView
                  errors={errors.fieldErrors.firstSceneData.event}
                />
              )}
              {/* Narration */}
              {/* TODO: Handle HTML formatting */}
              <FormField
                fieldDisplayName="Narration"
                fieldSerializeName="narration"
                fieldTooltipContent={
                  <div className="max-w-lg w-full flex flex-col space-y-1">
                    <p>
                      Narration is the text that the player sees in each scene.
                    </p>
                  </div>
                }
                maxRows={8}
                minRows={3}
                value={firstSceneNarration}
                onValueChange={(value) => setFirstSceneNarration(value)}
              />
              {errors?.fieldErrors?.firstSceneData?.narration && (
                <ErrorsDisplayView
                  errors={errors.fieldErrors.firstSceneData.narration}
                />
              )}
              {/* Scene Image */}
              <div className="flex flex-col space-y-2">
                <div className="flex flex-row justify-start items-center">
                  <p className="text-large">Scene Image</p>
                  <StyledTooltip
                    placement="right"
                    tooltipContent={
                      <div className="flex flex-col space-y-1">
                        <p>
                          A scene image is the image that the player sees in a
                          scene.
                        </p>
                        <p>
                          Currently, AI image generation only supports{" "}
                          <strong>English</strong> image description.
                        </p>
                      </div>
                    }
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
                {errors?.fieldErrors?.firstSceneData?.imageDescription && (
                  <ErrorsDisplayView
                    errors={errors.fieldErrors.firstSceneData.imageDescription}
                  />
                )}
                {errors?.fieldErrors?.firstSceneData?.imageUrl && (
                  <ErrorsDisplayView
                    errors={errors.fieldErrors.firstSceneData.imageUrl}
                  />
                )}
              </div>
              <div className="flex flex-row items-center justify-start">
                <p className="text-large">Proposed Actions</p>
                <StyledTooltip
                  placement="right"
                  tooltipContent={
                    <div className="w-full max-w-lg space-y-1">
                      <p>
                        Proposed actions are sample actions that the player can
                        choose from if they do not want to type an action
                        him/herself.
                      </p>
                      <p>It is recommended to have no more than 4 actions.</p>
                    </div>
                  }
                />
              </div>
              <StringListEditView
                list={firstSceneProposedActions}
                onListChange={setFirstSceneProposedActions}
              />
              {errors?.fieldErrors?.firstSceneData?.proposedActions && (
                <ErrorsDisplayView
                  errors={errors.fieldErrors.firstSceneData.proposedActions}
                />
              )}
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
            {errors?.fieldErrors?.publicTemplate && (
              <ErrorsDisplayView errors={errors.fieldErrors.publicTemplate} />
            )}
            <Button
              className="w-full"
              color="primary"
              isLoading={submitInProgress}
              onPress={async (e) => {
                await submitForm();
              }}
            >
              {submitInProgress ? <Spinner /> : submitButtonText}
            </Button>
          </div>
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
          isLoading={inProgress}
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

function StringListEditView({
  list,
  onListChange,
}: {
  list: string[];
  onListChange: (list: string[]) => void;
}) {
  function deleteItem(deleteIndex: number) {
    const newList = list.filter((_, index) => index !== deleteIndex);

    onListChange(newList);
  }

  function updateItem(updateIndex: number, value: string) {
    const newList = [...list];

    newList[updateIndex] = value;

    onListChange(newList);
  }

  function appendItem() {
    const newList = [...list, ""];

    onListChange(newList);
  }

  return (
    <div className="flex flex-col space-y-2">
      {list.map((item, index) => (
        <div key={index} className="flex flex-row justify-between items-center">
          <Input
            value={item}
            onValueChange={(value) => updateItem(index, value)}
          >
            {item}
          </Input>
          <Button
            isIconOnly
            color="danger"
            size="sm"
            variant="light"
            onClick={() => deleteItem(index)}
          >
            <div className="w-full max-w-6">
              <TrashIcon />
            </div>
          </Button>
        </div>
      ))}
      <Button isIconOnly className="w-full" onPress={(e) => appendItem()}>
        <div className="w-full max-w-6">
          <PlusIcon />
        </div>
      </Button>
    </div>
  );
}
