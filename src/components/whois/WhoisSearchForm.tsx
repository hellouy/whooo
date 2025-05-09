
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface WhoisSearchFormProps {
  onSearch: (domain: string, server?: string) => Promise<void>;
  loading: boolean;
  defaultProtocol?: "auto" | "rdap" | "whois";
  onProtocolChange?: (protocol: "auto" | "rdap" | "whois") => void;
}

export const WhoisSearchForm = ({ 
  onSearch, 
  loading,
  defaultProtocol = "auto",
  onProtocolChange
}: WhoisSearchFormProps) => {
  const [domain, setDomain] = useState("");
  const [protocol, setProtocol] = useState<"auto" | "rdap" | "whois">(defaultProtocol);
  const { toast } = useToast();

  // 改进的域名清理和验证函数
  const cleanDomain = (inputDomain: string) => {
    let cleanedDomain = inputDomain.trim().toLowerCase();
    
    // 去除协议和www前缀
    cleanedDomain = cleanedDomain.replace(/^(https?:\/\/)?(www\.)?/i, '');
    
    // 去除路径、查询字符串或哈希
    cleanedDomain = cleanedDomain.replace(/\/.*$/, '');
    cleanedDomain = cleanedDomain.replace(/\?.*$/, '');
    cleanedDomain = cleanedDomain.replace(/#.*$/, '');
    
    return cleanedDomain;
  };

  // 更严格的域名验证
  const validateDomain = (domain: string): boolean => {
    // 检查是否为纯IP地址
    const ipRegex = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
    if (ipRegex.test(domain)) {
      return false; // 不支持直接查询IP
    }
    
    // 简单域名格式验证
    const domainRegex = /^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
    return domainRegex.test(domain);
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

    // 清理域名输入
    const cleanedDomain = cleanDomain(domain);
      
    // 域名格式验证
    if (!validateDomain(cleanedDomain)) {
      toast({
        title: "错误",
        description: "请输入有效的域名格式 (如 example.com)",
        variant: "destructive",
      });
      return;
    }
    
    // 禁止查询某些特殊域名
    const restrictedDomains = ["example.com", "example.org", "example.net", "test.com"];
    if (restrictedDomains.includes(cleanedDomain)) {
      toast({
        title: "提示",
        description: `${cleanedDomain} 是保留域名，请尝试查询其它域名`,
        variant: "default",
      });
      return;
    }
    
    const protocolMessage = 
      protocol === "rdap" ? "正在使用RDAP协议查询..." : 
      protocol === "whois" ? "正在使用WHOIS协议查询..." :
      "正在查询域名信息，将优先使用RDAP协议...";
    
    toast({
      title: "查询中",
      description: `正在查询域名 ${cleanedDomain} 的信息，${protocolMessage}`,
    });
    
    try {
      // Make sure we properly await the onSearch promise
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
  
  const handleProtocolChange = (value: "auto" | "rdap" | "whois") => {
    setProtocol(value);
    if (onProtocolChange) {
      onProtocolChange(value);
    }
  };

  return (
    <Card className="p-6 mb-8">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row gap-4">
          <Input
            type="text"
            placeholder="请输入域名 (例如: google.com)"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            className="flex-1"
            onKeyPress={handleKeyPress}
          />
          
          <Select 
            value={protocol}
            onValueChange={(value: any) => handleProtocolChange(value)}
          >
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="查询协议" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">自动选择协议</SelectItem>
              <SelectItem value="rdap">RDAP协议</SelectItem>
              <SelectItem value="whois">WHOIS协议</SelectItem>
            </SelectContent>
          </Select>
          
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
                <p>
                  {protocol === "auto" && "优先使用RDAP协议查询域名信息"}
                  {protocol === "rdap" && "使用RDAP协议查询域名信息"}
                  {protocol === "whois" && "使用WHOIS协议查询域名信息"}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        
        <div className="text-sm text-gray-500">
          <p>支持查询全球常见顶级域名: .com, .net, .org, .cn, .io 等</p>
          <p className="mt-1">输入格式: example.com（无需添加http://或www.）</p>
          <p className="mt-1">
            {protocol === "auto" && "自动选择协议: 优先使用RDAP，失败后自动切换到WHOIS"}
            {protocol === "rdap" && "RDAP协议: 更现代的域名查询协议，提供结构化数据"}
            {protocol === "whois" && "WHOIS协议: 传统域名查询协议，覆盖范围更广"}
          </p>
        </div>
      </div>
    </Card>
  );
};
