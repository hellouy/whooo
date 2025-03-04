
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { XCircleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WhoisErrorAlertProps {
  error: string;
  domain?: string;
  onRetry?: () => void;
}

export const WhoisErrorAlert = ({ error, domain, onRetry }: WhoisErrorAlertProps) => {
  // 针对常见错误提供更具体的解释
  const getErrorMessage = (error: string) => {
    if (error.includes("404") || error.includes("Request failed with status code 404")) {
      return "找不到WHOIS API服务。请确保API服务已正确部署并可访问。";
    } else if (error.includes("连接WHOIS服务器时出错")) {
      return "无法连接到WHOIS服务器，可能是网络问题或服务器暂时不可用。";
    } else if (error.includes("查询超时")) {
      return "WHOIS服务器查询超时，请稍后重试。";
    } else if (error.includes("未找到顶级域名")) {
      return "无法识别该域名的顶级域名或不支持该顶级域名的WHOIS查询。";
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
