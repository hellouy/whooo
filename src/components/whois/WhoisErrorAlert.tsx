
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { XCircleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WhoisErrorAlertProps {
  error: string;
  domain?: string;
  onRetry?: () => void;
}

export const WhoisErrorAlert = ({ error, domain, onRetry }: WhoisErrorAlertProps) => {
  // Get more specific error message based on error content
  const getErrorMessage = (error: string) => {
    if (error.includes("404") || error.includes("Request failed with status code 404")) {
      return "找不到WHOIS API服务。请确保API服务已正确部署并可访问。如果您在本地运行，请确保API服务器已启动。 (WHOIS API service not found. Please ensure the API service is correctly deployed and accessible.)";
    } else if (error.includes("连接WHOIS服务器时出错") || error.includes("ECONNREFUSED")) {
      return "无法连接到WHOIS服务器，可能是网络问题或服务器暂时不可用。 (Unable to connect to WHOIS server, possibly due to network issues or server unavailability.)";
    } else if (error.includes("查询超时") || error.includes("ETIMEDOUT")) {
      return "WHOIS服务器查询超时，请稍后重试。 (WHOIS server query timed out, please try again later.)";
    } else if (error.includes("未找到顶级域名")) {
      return "无法识别该域名的顶级域名或不支持该顶级域名的WHOIS查询。 (Unable to identify the top-level domain or WHOIS queries for this TLD are not supported.)";
    } else if (error.includes("whoiser") || error.includes("not a function") || error.includes("no default export")) {
      return "WHOIS客户端查询工具出错，正在尝试使用备用方式查询。 (Error with WHOIS client query tool, trying alternative query method.)";
    }
    return error;
  };

  return (
    <Alert variant="destructive" className="mb-8">
      <XCircleIcon className="h-4 w-4" />
      <AlertTitle>查询失败 (Query Failed)</AlertTitle>
      <AlertDescription className="flex flex-col gap-2">
        <div>{getErrorMessage(error)}</div>
        {domain && <div className="text-xs">域名 (Domain): {domain}</div>}
        {onRetry && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onRetry}
            className="self-start mt-2"
          >
            重试查询 (Retry Query)
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
};
