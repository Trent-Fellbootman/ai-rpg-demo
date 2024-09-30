"use client";

import { Card, CardBody } from "@nextui-org/card";
import { Input } from "@nextui-org/input";
import { EyeSlashFilledIcon, EyeFilledIcon } from "@nextui-org/shared-icons";
import React from "react";
import { Spacer } from "@nextui-org/spacer";
import { Button } from "@nextui-org/button";
import { Link } from "@nextui-org/link";

import { authenticate } from "@/app/lib/actions";
import { constants } from "@/app/lib/utils/path";

export default function LoginForm() {
  const [isPasswordVisible, setIsPasswordVisible] = React.useState(false);
  const [errorState, setErrorState] = React.useState<string | undefined>(
    undefined,
  );
  const [isPending, setIsPending] = React.useState(false);

  const togglePasswordVisibility = () =>
    setIsPasswordVisible(!isPasswordVisible);

  const formAction = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    setIsPending(true);
    setErrorState(undefined);

    const response = await authenticate(formData);

    setErrorState(response);
    setIsPending(false);
  };

  return (
    <Card className="p-3 w-full">
      <CardBody>
        <form onSubmit={formAction}>
          <h1 className="text-2xl text-center font-bold">登录</h1>
          <Spacer y={4} />
          <p className="font-bold pl-1">邮箱</p>
          <Spacer y={4} />
          <Input
            isClearable
            color="primary"
            name="email"
            placeholder="输入您的邮箱"
            variant="bordered"
          />
          <Spacer y={4} />
          <p className="font-bold pl-1">密码</p>
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
            name="password"
            placeholder="输入您的密码"
            type={isPasswordVisible ? "text" : "password"}
            variant="bordered"
          />
          <Spacer y={4} />
          <Button
            className="w-full"
            color="primary"
            isLoading={isPending}
            type="submit"
          >
            登录
          </Button>
          {errorState && <p className="text-red-500">{errorState}</p>}
          <div className="text-center">
            没有账号？从
            <Link href={constants.signupPagePath}>这里</Link>注册!
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
