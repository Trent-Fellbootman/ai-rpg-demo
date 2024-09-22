-- AlterTable
ALTER TABLE "Scene" ADD COLUMN     "proposedActions" TEXT[] DEFAULT ARRAY[]::TEXT[];
