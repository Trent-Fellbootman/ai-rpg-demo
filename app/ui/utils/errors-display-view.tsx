export function ErrorsDisplayView({ errors }: { errors: string[] }) {
  return (
    <div className="flex flex-col">
      {errors.map((error) => (
        <p key={error} className="text-sm text-red-500">
          {error}
        </p>
      ))}
    </div>
  );
}
