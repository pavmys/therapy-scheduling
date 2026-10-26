import { CircleAlert, CircleCheck } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Результат дії форми (DESIGN.md, розділ 6): успіх — role="status", помилка — role="alert"; текст — дослівно з AC.
function ActionMessage({ ok, message }: { ok: boolean; message: string }) {
  return (
    <Alert variant={ok ? "success" : "destructive"} role={ok ? "status" : "alert"}>
      {ok ? <CircleCheck aria-hidden="true" /> : <CircleAlert aria-hidden="true" />}
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

export { ActionMessage };
