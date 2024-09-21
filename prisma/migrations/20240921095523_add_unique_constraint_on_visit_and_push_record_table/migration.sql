/*
  Warnings:

  - A unique constraint covering the columns `[userId,gameTemplateId]` on the table `GameTemplatePush` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId,gameTemplateId]` on the table `GameTemplateVisit` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "GameTemplatePush_userId_gameTemplateId_key" ON "GameTemplatePush"("userId", "gameTemplateId");

-- CreateIndex
CREATE UNIQUE INDEX "GameTemplateVisit_userId_gameTemplateId_key" ON "GameTemplateVisit"("userId", "gameTemplateId");
