import SessionCreationForm from "@/app/ui/session-creation-form";

export default function Page() {
  return (
    <div className="w-full flex flex-col items-center">
      <div className="max-w-3xl w-full">
        <SessionCreationForm />
      </div>
    </div>
  );
}
