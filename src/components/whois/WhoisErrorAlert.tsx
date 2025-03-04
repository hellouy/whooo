
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { XCircleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WhoisErrorAlertProps {
  error: string;
  domain?: string;
  onRetry?: () => void;
}

export const WhoisErrorAlert = ({ error, domain, onRetry }: WhoisErrorAlertProps) => {
  // 针对404错误提供更具体的解释
  const getErrorMessage = (error: string) => {
    if (error.includes("404") || error.includes("Request failed with status code 404")) {
      return "找不到WHOIS API服务。请确保API服务已正确部署并可访问。";
    }
    return error;
  };

  return (
    <Alert variant="destructive" className="mb-8">
      <XCircleIcon className="h-4 w-4" />
      <AlertTitle>查询失败</AlertTitle>
      <AlertDescription className="flex flex-col gap-2">
        <div>{getErrorMessage(error)}</div>
        {domain && <div className="text-xs">域名: {domain}</div>}
        {onRetry && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onRetry}
            className="self-start mt-2"
          >
            重试查询
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
};
