"use client";

import { useRouter } from "next/navigation";

import GameTemplateEditForm, {
  OptionalGameTemplateData,
} from "@/app/ui/game-templates/game-template-edit-form";
import { GameTemplateData } from "@/app/lib/database-actions/game-template-actions";
import {
  createGameTemplateAction,
  GameTemplateDataSubmitErrors,
} from "@/app/lib/actions";
import { getTemplateOverviewPath } from "@/app/lib/utils/path";

export default async function GameTemplateCreationViewClient({
  userId,
  sampleTemplatesData,
}: {
  userId: number;
  sampleTemplatesData: OptionalGameTemplateData[];
}) {
  const router = useRouter();

  async function createGameTemplate(
    data: GameTemplateData,
  ): Promise<GameTemplateDataSubmitErrors | undefined> {
    const result = await createGameTemplateAction({ userId, data });

    if (result.templateId) {
      // finished successfully
      router.replace(getTemplateOverviewPath(result.templateId));
    }

    return result.errors;
  }

  return (
    <GameTemplateEditForm
      sampleTemplatesData={sampleTemplatesData}
      submitButtonText="创建游戏模板"
      onSubmitForm={createGameTemplate}
    />
  );
}
