import SessionCreationView from "@/app/ui/session-creation/session-creation-view";

export default function Page() {
  return (
    <div className="w-full flex flex-col items-center">
      <div className="max-w-5xl w-full">
        <SessionCreationView />
      </div>
    </div>
  );
}
