-- AlterTable
ALTER TABLE "GameSession" ADD COLUMN     "parentTemplateId" INTEGER;

-- AddForeignKey
ALTER TABLE "GameSession" ADD CONSTRAINT "GameSession_parentTemplateId_fkey" FOREIGN KEY ("parentTemplateId") REFERENCES "GameTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
