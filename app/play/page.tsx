import Image from "next/image";
import { Textarea } from "@nextui-org/input";
import { Spacer } from "@nextui-org/spacer";

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
      <Textarea
        label="Action"
        placeholder="Describe what you would like to do"
      />
    </div>
  );
}
