"use client";

import { useState } from "react";
import { Textarea } from "@nextui-org/input";
import { Spacer } from "@nextui-org/spacer";
import { Button } from "@nextui-org/button";

import generateNextScene, { Errors } from "@/app/lib/generate-next-scene";

export default function ActionInputForm() {
  const [state, setState] = useState<Errors | undefined>({});

  const formAction = async (formData: FormData) => {
    const response = await generateNextScene(formData);

    setState(response.errors);
  };

  return (
    <form action={formAction}>
      <div className="flex flex-row items-center">
        <div className="flex flex-col flex-1">
          <Textarea
            label="Action"
            maxRows={5}
            minRows={2}
            name="action"
            placeholder="Describe what you would like to do"
          />
          {state && <p className="text-red-500">{state.action}</p>}
        </div>
        <Spacer x={1} />
        <Button color="primary" type="submit">
          Take Action
        </Button>
      </div>
    </form>
  );
}
