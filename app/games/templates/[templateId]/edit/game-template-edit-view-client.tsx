"use client";

import { useRouter } from "next/navigation";
import React from "react";

import GameTemplateEditForm, {
  OptionalGameTemplateData,
} from "@/app/ui/game-templates/game-template-edit-form";
import { GameTemplateData } from "@/app/lib/database-actions/game-template-actions";
import {
  GameTemplateDataSubmitErrors,
  updateGameTemplateAction,
} from "@/app/lib/actions";
import { getTemplateOverviewPath } from "@/app/lib/utils/path";
import { Spacer } from "@nextui-org/spacer";

export default async function GameTemplateEditViewClient({
  userId,
  templateId,
  prefilledFields,
  sampleTemplatesData,
}: {
  userId: number;
  templateId: number;
  prefilledFields: OptionalGameTemplateData;
  sampleTemplatesData: OptionalGameTemplateData[];
}) {
  const router = useRouter();

  async function saveGameTemplate(
    templateData: GameTemplateData,
  ): Promise<GameTemplateDataSubmitErrors | undefined> {
    const result = await updateGameTemplateAction({
      userId,
      templateId,
      data: templateData,
    });

    if (!result) {
      // finished successfully
      router.replace(getTemplateOverviewPath(templateId));
    }

    return result;
  }

  return (
    <div className="w-full">
      {/* Title */}
      <p className="text-center text-3xl">编辑模板</p>
      <Spacer y={2} />
      <GameTemplateEditForm
        prefilledFields={prefilledFields}
        sampleTemplatesData={sampleTemplatesData}
        submitButtonText="Save"
        onSubmitForm={saveGameTemplate}
      />
    </div>
  );
}
