
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

  // Improved domain cleaning function
  const cleanDomain = (inputDomain: string) => {
    let cleanedDomain = inputDomain.trim().toLowerCase();
    
    // Remove any protocol and www prefix
    cleanedDomain = cleanedDomain.replace(/^(https?:\/\/)?(www\.)?/i, '');
    
    // Remove any path, query string, or hash
    cleanedDomain = cleanedDomain.replace(/\/.*$/, '');
    cleanedDomain = cleanedDomain.replace(/\?.*$/, '');
    cleanedDomain = cleanedDomain.replace(/#.*$/, '');
    
    return cleanedDomain;
  };

  const handleSubmit = async () => {
    if (!domain) {
      toast({
        title: "错误",
        description: "请输入域名",
        variant: "destructive",
      });
      return;
    }

    // Clean the domain input
    const cleanedDomain = cleanDomain(domain);
      
    // Simple domain format validation
    const domainRegex = /^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
    if (!domainRegex.test(cleanedDomain)) {
      toast({
        title: "错误",
        description: "请输入有效的域名格式 (如 example.com)",
        variant: "destructive",
      });
      return;
    }
    
    toast({
      title: "查询中",
      description: `正在查询域名 ${cleanedDomain} 的信息，将优先使用RDAP协议...`,
    });
    
    try {
      await onSearch(cleanedDomain);
    } catch (error) {
      console.error("域名查询失败:", error);
      toast({
        title: "查询失败",
        description: "域名查询过程中出现错误，请稍后重试",
        variant: "destructive",
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      void handleSubmit();
    }
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
          onKeyPress={handleKeyPress}
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
              <p>优先使用RDAP协议查询域名信息</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      <div className="text-sm text-gray-500">
        <p>支持查询全球常见顶级域名: .com, .net, .org, .cn, .io 等</p>
        <p className="mt-1">输入格式: example.com（无需添加http://或www.）</p>
        <p className="mt-1">查询使用RDAP协议，如失败将自动使用本地WHOIS查询</p>
      </div>
    </Card>
  );
};
