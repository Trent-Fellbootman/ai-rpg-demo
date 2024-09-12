"use client";

import { Card, CardBody } from "@nextui-org/card";
import { Input } from "@nextui-org/input";
import { EyeSlashFilledIcon, EyeFilledIcon } from "@nextui-org/shared-icons";
import React from "react";
import { Spacer } from "@nextui-org/spacer";
import { Button } from "@nextui-org/button";

import { Response, signup } from "@/app/lib/signup";

export default function SignupForm() {
  const [isFirstPasswordVisible, setIsFirstPasswordVisible] =
    React.useState(false);

  const [isSecondPasswordVisible, setIsSecondPasswordVisible] =
    React.useState(false);

  const toggleFirstPasswordVisibility = () =>
    setIsFirstPasswordVisible(!isFirstPasswordVisible);

  const toggleSecondPasswordVisibility = () =>
    setIsSecondPasswordVisible(!isSecondPasswordVisible);

  const [responseState, setResponseState] = React.useState<Response>(null);

  const [inProgress, setInProgress] = React.useState<boolean>(false);

  async function formAction(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    setInProgress(true);
    setResponseState(null);

    const response = await signup(formData);

    setResponseState(response);
    setInProgress(false);
  }

  return (
    <Card className="p-3 w-full">
      <CardBody>
        <form onSubmit={formAction}>
          <h1 className="text-2xl text-center font-bold">Signup</h1>
          <Spacer y={4} />
          <p className="font-bold pl-1">Email</p>
          <Spacer y={4} />
          <Input
            isClearable
            color="primary"
            name="email"
            placeholder="Enter your email"
            variant="bordered"
          />
          {responseState?.fieldErrors?.email &&
            responseState?.fieldErrors.email.map((error: string) => (
              <p key={error} className="mt-2 text-sm text-red-500">
                {error}
              </p>
            ))}
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
                onClick={toggleFirstPasswordVisibility}
              >
                {isFirstPasswordVisible ? (
                  <EyeSlashFilledIcon className="text-2xl text-default-400 pointer-events-none" />
                ) : (
                  <EyeFilledIcon className="text-2xl text-default-400 pointer-events-none" />
                )}
              </button>
            }
            name="password"
            placeholder="Enter your password"
            type={isFirstPasswordVisible ? "text" : "password"}
            variant="bordered"
          />
          {responseState?.fieldErrors?.password &&
            responseState?.fieldErrors.password.map((error: string) => (
              <p key={error} className="mt-2 text-sm text-red-500">
                {error}
              </p>
            ))}
          <Spacer y={4} />
          <p className="font-bold pl-1">Enter password again</p>
          <Spacer y={4} />
          <Input
            color="primary"
            endContent={
              <button
                aria-label="toggle password visibility"
                className="focus:outline-none"
                type="button"
                onClick={toggleSecondPasswordVisibility}
              >
                {isSecondPasswordVisible ? (
                  <EyeSlashFilledIcon className="text-2xl text-default-400 pointer-events-none" />
                ) : (
                  <EyeFilledIcon className="text-2xl text-default-400 pointer-events-none" />
                )}
              </button>
            }
            name="confirmPassword"
            placeholder="re-enter your password"
            type={isSecondPasswordVisible ? "text" : "password"}
            variant="bordered"
          />
          {responseState?.fieldErrors?.confirmPassword &&
            responseState?.fieldErrors.confirmPassword.map((error: string) => (
              <p key={error} className="mt-2 text-sm text-red-500">
                {error}
              </p>
            ))}
          {responseState?.message && (
            <p className="mt-2 text-sm text-red-500">
              {responseState?.message}
            </p>
          )}
          <Spacer y={4} />
          <Button
            className="w-full"
            color="primary"
            isLoading={inProgress}
            type="submit"
          >
            Signup
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}
