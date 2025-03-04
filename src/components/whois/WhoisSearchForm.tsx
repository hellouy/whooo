
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface WhoisSearchFormProps {
  onSearch: (domain: string, server?: string) => Promise<void>;
  loading: boolean;
}

export const WhoisSearchForm = ({ onSearch, loading }: WhoisSearchFormProps) => {
  const [domain, setDomain] = useState("");
  const { toast } = useToast();

  const handleSubmit = () => {
    if (!domain) {
      toast({
        title: "错误",
        description: "请输入域名",
        variant: "destructive",
      });
      return;
    }

    // 简单的域名格式验证
    const domainRegex = /^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
    if (!domainRegex.test(domain)) {
      toast({
        title: "错误",
        description: "请输入有效的域名格式",
        variant: "destructive",
      });
      return;
    }
    
    onSearch(domain);
  };

  return (
    <Card className="p-6 mb-8">
      <div className="flex gap-4 mb-4">
        <Input
          type="text"
          placeholder="请输入域名 (例如: google.com)"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          className="flex-1"
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleSubmit();
            }
          }}
        />
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                onClick={handleSubmit}
                disabled={loading}
                className="min-w-[100px]"
              >
                {loading ? "查询中..." : "查询"}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>查询域名的WHOIS信息</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      <div className="text-sm text-gray-500">
        <p>支持查询全球常见顶级域名: .com, .net, .org, .cn, .io 等</p>
      </div>
    </Card>
  );
};
