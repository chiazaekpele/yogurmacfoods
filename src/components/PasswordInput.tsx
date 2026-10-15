"use client";

import { useState } from "react";
import { Icon } from "./Icon";

// A password box with an eye button that shows or hides what was typed.
export function PasswordInput(props: Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">) {
  const [shown, setShown] = useState(false);
  return (
    <div className="pw">
      <input {...props} type={shown ? "text" : "password"} />
      <button type="button" className="pw-toggle" onClick={() => setShown((s) => !s)} aria-label={shown ? "Hide password" : "Show password"} aria-pressed={shown} title={shown ? "Hide password" : "Show password"}>
        <Icon name={shown ? "eyeOff" : "eye"} size={20} />
      </button>
    </div>
  );
}
