import Image from "next/image";
import { Spacer } from "@nextui-org/spacer";
import { Card, CardBody } from "@nextui-org/card";
import parse from "html-react-parser";

import ActionInputForm from "@/app/ui/game/action-input-form";

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
      <Card>
        <CardBody>{parse("A: something<br/>B: something else")}</CardBody>
      </Card>
      <Spacer y={2} />
      <ActionInputForm />
    </div>
  );
}
