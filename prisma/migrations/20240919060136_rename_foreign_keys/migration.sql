-- AlterTable
ALTER TABLE "GameTemplateComment" RENAME CONSTRAINT "Comment_pkey" TO "GameTemplateComment_pkey";

-- RenameForeignKey
ALTER TABLE "GameTemplateComment" RENAME CONSTRAINT "Comment_gameTemplateId_fkey" TO "GameTemplateComment_gameTemplateId_fkey";

-- RenameForeignKey
ALTER TABLE "GameTemplateComment" RENAME CONSTRAINT "Comment_userId_fkey" TO "GameTemplateComment_userId_fkey";
