import Image from "next/image";
import { Textarea } from "@nextui-org/input";
import { Spacer } from "@nextui-org/spacer";
import {Button, ButtonGroup} from "@nextui-org/button";

export default function Page() {
  return (
    <div>
      <Image
        alt="Picture of the author"
        className="rounded-xl"
        height={672}
        sizes="100vw"
        src="/sample-ai-image.jpg"
        style={{
          width: "100%",
          height: "auto",
        }}
        width={1008}
      />
      <Spacer y={2} />
      <div className="flex flex-row items-center">
        <Textarea
          label="Action"
          maxRows={5}
          minRows={2}
          placeholder="Describe what you would like to do"
        />
        <Spacer x={1} />
        <Button color="primary">Take Action</Button>
      </div>
    </div>
  );
}
