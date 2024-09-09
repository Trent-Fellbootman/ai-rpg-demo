import Image from "next/image";
import { Textarea } from "@nextui-org/input";

export default function Page() {
  return (
    <div>
      <Image
        alt="Picture of the author"
        height={672}
        sizes="100vw"
        src="/sample-ai-image.jpg"
        style={{
          width: "100%",
          height: "auto",
        }}
        width={1008}
      />
      <Textarea
        label="Action"
        placeholder="Describe what you would like to do"
      />
    </div>
  );
}
