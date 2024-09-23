"use client";

import { Swiper, SwiperSlide } from "swiper/react";
import { Card, CardBody } from "@nextui-org/card";
import { Image } from "@nextui-org/image";
import { Spacer } from "@nextui-org/spacer";
import "swiper/css";
import parse from "html-react-parser";

/**
 * Widget to display an entire session.
 */
export function SessionDisplayViewClient({
  scenes,
}: {
  scenes: {
    imageUrl: string;
    narration: string;
    action: string | null;
  }[];
}) {
  return (
    <div className="w-full max-w-full">
      <Swiper slidesPerView={1} spaceBetween={50} style={{ width: "100%" }}>
        {Array.from({ length: scenes.length }, (_, index) => (
          <SwiperSlide key={index}>
            <SceneCard
              key={index}
              action={scenes[index].action}
              imageUrl={scenes[index].imageUrl}
              text={scenes[index].narration}
            />
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}

async function SceneCard({
  imageUrl,
  text,
  action,
}: {
  imageUrl: string;
  text: string;
  action: string | null;
}) {
  return (
    <Card className="w-full p-4 shadow-lg">
      <CardBody>
        <div className="flex justify-center">
          <Image
            alt="Scene image"
            className="rounded-xl"
            height={1024}
            sizes="100vw"
            src={imageUrl}
            style={{
              width: "100%",
              height: "auto",
            }}
            width={1024}
          />
        </div>
        <div className="flex flex-col space-y-4 mt-4">
          {/* First text bubble aligned to the left */}
          <div className="flex justify-start">
            <div className="bg-primary px-4 py-2 rounded-xl relative text-white">
              <div className="flex flex-col space-y-1">{parse(text)}</div>
            </div>
            <Spacer x={10} />
          </div>
          {/* Second text bubble aligned to the right */}
          {action && (
            <div className="flex justify-end">
              <Spacer x={10} />
              <div className="bg-secondary px-4 py-2 rounded-xl relative text-white">
                <p>{action}</p>
              </div>
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
