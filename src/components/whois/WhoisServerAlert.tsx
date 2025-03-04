
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RefreshCcwIcon } from "lucide-react";

interface WhoisServerAlertProps {
  server: string;
  onFetchMore: (server: string) => void;
  loading: boolean;
}

export const WhoisServerAlert = ({ 
  server, 
  onFetchMore, 
  loading 
}: WhoisServerAlertProps) => {
  return (
    <Alert className="mb-8">
      <RefreshCcwIcon className="h-4 w-4" />
      <AlertTitle>发现更具体的WHOIS服务器</AlertTitle>
      <AlertDescription className="flex flex-col md:flex-row md:items-center gap-2">
        <span>从 {server} 获取更详细的信息</span>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => onFetchMore(server)}
          disabled={loading}
        >
          获取更多信息
        </Button>
      </AlertDescription>
    </Alert>
  );
};
