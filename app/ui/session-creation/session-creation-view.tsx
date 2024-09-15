import SessionCreationViewClient from "@/app/ui/session-creation/session-creation-view-client";
import { sampleSessionCreationTemplates } from "@/content/sample-session-setup";

export default async function SessionCreationView() {
  // TODO: fetch templates from the database
  const templates = sampleSessionCreationTemplates;

  return <SessionCreationViewClient sampleSetups={templates} />;
}
