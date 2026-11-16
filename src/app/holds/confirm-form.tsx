"use client";

import { createContext, useActionState, useContext, useEffect, useState, type ReactNode } from "react";
import { ActionMessage } from "@/components/ui/action-message";
import { Button } from "@/components/ui/button";
import { confirmHold, type ConfirmHoldState } from "./actions";

// Результат підтвердження показуємо одним повідомленням над таблицею утримань, а не в рядку: колонка «Action»
// вузька, і довгий текст (зокрема «Sign all consent documents before confirming.», AC-DOC-07) ламався по слову й
// обрізався прокруткою таблиці (UAT 16.11, кадр AC-DOC-07). Повідомлення — дослівно з AC, як і раніше.
const ConfirmFeedbackContext = createContext<((state: ConfirmHoldState) => void) | null>(null);

export function ConfirmFeedback({ children }: { children: ReactNode }) {
  const [result, setResult] = useState<ConfirmHoldState>(null);
  return (
    <ConfirmFeedbackContext.Provider value={setResult}>
      {result ? (
        <div data-testid="confirm-result">
          <ActionMessage ok={result.ok} message={result.message} />
        </div>
      ) : null}
      {children}
    </ConfirmFeedbackContext.Provider>
  );
}

export function ConfirmForm({ holdId }: { holdId: string }) {
  const [state, formAction, pending] = useActionState<ConfirmHoldState, FormData>(confirmHold, null);
  const report = useContext(ConfirmFeedbackContext);

  useEffect(() => {
    if (state && report) report(state);
  }, [state, report]);

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="hold_id" value={holdId} />
      <Button type="submit" size="sm" disabled={pending}>
        Confirm
      </Button>
    </form>
  );
}
