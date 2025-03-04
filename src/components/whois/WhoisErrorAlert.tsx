
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { XCircleIcon } from "lucide-react";

interface WhoisErrorAlertProps {
  error: string;
}

export const WhoisErrorAlert = ({ error }: WhoisErrorAlertProps) => {
  return (
    <Alert variant="destructive" className="mb-8">
      <XCircleIcon className="h-4 w-4" />
      <AlertTitle>查询失败</AlertTitle>
      <AlertDescription>
        {error}
      </AlertDescription>
    </Alert>
  );
};
