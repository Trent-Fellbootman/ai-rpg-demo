"use client";

import { Card, CardBody } from "@nextui-org/card";
import { Input } from "@nextui-org/input";
import { EyeSlashFilledIcon, EyeFilledIcon } from "@nextui-org/shared-icons";
import React from "react";
import { Spacer } from "@nextui-org/spacer";
import { Button } from "@nextui-org/button";

export default function LoginForm() {
  const [isPasswordVisible, setIsPasswordVisible] = React.useState(false);

  const togglePasswordVisibility = () =>
    setIsPasswordVisible(!isPasswordVisible);

  return (
    <Card className="p-3">
      <CardBody>
        <h1 className="text-2xl text-center font-bold">Login</h1>
        <Spacer y={4} />
        <p className="font-bold pl-1">Email</p>
        <Spacer y={4} />
        <Input
          isClearable
          color="primary"
          defaultValue="junior@nextui.org"
          placeholder="Enter your email"
          type="email"
          variant="bordered"
          onClear={() => console.log("input cleared")}
        />
        <Spacer y={4} />
        <p className="font-bold pl-1">Password</p>
        <Spacer y={4} />
        <Input
          color="primary"
          endContent={
            <button
              aria-label="toggle password visibility"
              className="focus:outline-none"
              type="button"
              onClick={togglePasswordVisibility}
            >
              {isPasswordVisible ? (
                <EyeSlashFilledIcon className="text-2xl text-default-400 pointer-events-none" />
              ) : (
                <EyeFilledIcon className="text-2xl text-default-400 pointer-events-none" />
              )}
            </button>
          }
          placeholder="Enter your password"
          type={isPasswordVisible ? "text" : "password"}
          variant="bordered"
        />
        <Spacer y={4} />
        <Button color="primary" type="submit">
          Login
        </Button>
      </CardBody>
    </Card>
  );
}
