"use client";

import { Input, Textarea } from "@nextui-org/input";
import { Spacer } from "@nextui-org/spacer";
import { Button } from "@nextui-org/button";

export default function SessionCreationForm() {
  return (
    <div className="max-w-xl w-full">
      <form>
        <p className="text-center text-3xl">Create a session</p>
        <Spacer y={2} />
        <p className="text-large">Name</p>
        <Spacer y={2} />
        <Input label="Session Name" placeholder="Middle School Horror" />
        <Spacer y={2} />
        <p className="text-large">Back Story</p>
        <Spacer y={2} />
        <Textarea
          label="Initial Back Story"
          placeholder="On a dark dark night, you find yourself in a deserted middle school..."
        />
        <Spacer y={4} />
        <Button className="w-full" color="primary" type="submit">
          Create
        </Button>
      </form>
    </div>
  );
}
