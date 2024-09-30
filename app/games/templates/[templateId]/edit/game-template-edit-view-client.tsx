"use client";

import { useRouter } from "next/navigation";

import GameTemplateEditForm, {
  OptionalGameTemplateData,
} from "@/app/ui/game-templates/game-template-edit-form";
import { GameTemplateData } from "@/app/lib/database-actions/game-template-actions";
import {
  GameTemplateDataSubmitErrors,
  updateGameTemplateAction,
} from "@/app/lib/actions";
import { getTemplateOverviewPath } from "@/app/lib/utils/path";

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
    <GameTemplateEditForm
      prefilledFields={prefilledFields}
      sampleTemplatesData={sampleTemplatesData}
      submitButtonText="Save"
      onSubmitForm={saveGameTemplate}
    />
  );
}
