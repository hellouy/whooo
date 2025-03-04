
import { useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { InfoIcon, AlertCircleIcon, XCircleIcon, CheckCircleIcon, RefreshCcwIcon } from "lucide-react";

const Index = () => {
  const [domain, setDomain] = useState("");
  const [whoisData, setWhoisData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [specificServer, setSpecificServer] = useState<string | null>(null);
  const { toast } = useToast();

  const handleWhoisLookup = async (server?: string) => {
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

    setLoading(true);
    setError(null);
    
    if (!server) {
      setWhoisData(null);
      setSpecificServer(null);
    }
    
    try {
      // 使用本地 API 路由来获取 WHOIS 信息
      const apiUrl = '/api/whois';
      const requestData = server ? { domain, server } : { domain };
      
      console.log("Sending WHOIS request:", requestData);
      const whoisResponse = await axios.post(apiUrl, requestData);
      console.log("WHOIS Response:", whoisResponse.data);

      if (whoisResponse.data.error) {
        setError(whoisResponse.data.error);
        toast({
          title: "查询失败",
          description: whoisResponse.data.error,
          variant: "destructive",
        });
      } else {
        // 如果有建议的特定WHOIS服务器
        if (whoisResponse.data.suggestedServer && !server) {
          setSpecificServer(whoisResponse.data.suggestedServer);
          toast({
            title: "初步查询成功",
            description: "发现更具体的WHOIS服务器，点击'获取更多信息'获取详细数据",
          });
        } else {
          setSpecificServer(null);
          toast({
            title: "查询成功",
            description: "已获取域名信息",
          });
        }
        
        // 处理价格信息
        let priceData = null;
        try {
          const priceResponse = await axios.get(`https://who.cx/api/price?domain=${domain}`);
          console.log("Price Response:", priceResponse.data);
          priceData = priceResponse.data;
        } catch (priceError) {
          console.error("Price lookup error:", priceError);
          // 价格获取失败不影响 WHOIS 查询
        }
        
        // 组合信息
        const result = {
          domain: domain,
          whoisServer: whoisResponse.data.whoisServer || server || "未知",
          registrar: whoisResponse.data.registrar || "未知",
          registrationDate: whoisResponse.data.creationDate || "未知",
          expiryDate: whoisResponse.data.expiryDate || "未知",
          nameServers: whoisResponse.data.nameServers || [],
          registrant: whoisResponse.data.registrant || "未知",
          status: whoisResponse.data.status || "未知",
          rawData: whoisResponse.data.rawData || "",
          price: priceData
        };
        
        setWhoisData(result);
      }
    } catch (error: any) {
      console.error("Whois lookup error:", error);
      const errorMessage = error.response?.data?.error || error.message || "无法连接到WHOIS服务器";
      setError(errorMessage);
      toast({
        title: "查询失败",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Whois 域名查询系统
          </h1>
          <p className="text-gray-600">
            直接连接WHOIS服务器查询详细注册信息
          </p>
        </div>

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
                  handleWhoisLookup();
                }
              }}
            />
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    onClick={() => handleWhoisLookup()}
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

        {specificServer && (
          <Alert className="mb-8">
            <RefreshCcwIcon className="h-4 w-4" />
            <AlertTitle>发现更具体的WHOIS服务器</AlertTitle>
            <AlertDescription className="flex flex-col md:flex-row md:items-center gap-2">
              <span>从 {specificServer} 获取更详细的信息</span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleWhoisLookup(specificServer)}
                disabled={loading}
              >
                获取更多信息
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive" className="mb-8">
            <XCircleIcon className="h-4 w-4" />
            <AlertTitle>查询失败</AlertTitle>
            <AlertDescription>
              {error}
            </AlertDescription>
          </Alert>
        )}

        {whoisData && (
          <Card className="p-6">
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center">
                <CheckCircleIcon className="h-5 w-5 mr-2 text-green-500" />
                {whoisData.domain} 的 WHOIS 信息
              </h2>
              <p className="text-sm text-gray-600">WHOIS服务器: {whoisData.whoisServer}</p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="text-lg font-semibold mb-2 flex items-center">
                  <InfoIcon className="h-4 w-4 mr-2" />
                  基本信息
                </h3>
                <div className="space-y-2">
                  <p><span className="font-medium">注册商:</span> {whoisData.registrar}</p>
                  <p><span className="font-medium">创建日期:</span> {whoisData.registrationDate}</p>
                  <p><span className="font-medium">到期日期:</span> {whoisData.expiryDate}</p>
                  <p><span className="font-medium">状态:</span> {whoisData.status}</p>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-2 flex items-center">
                  <InfoIcon className="h-4 w-4 mr-2" />
                  名称服务器
                </h3>
                <div className="space-y-1">
                  {whoisData.nameServers && whoisData.nameServers.length > 0 ? (
                    whoisData.nameServers.map((ns: string, index: number) => (
                      <p key={index}>{ns}</p>
                    ))
                  ) : (
                    <p>无可用的名称服务器信息</p>
                  )}
                </div>
              </div>
            </div>
            
            {whoisData.price && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2 flex items-center">
                  <InfoIcon className="h-4 w-4 mr-2" />
                  价格信息
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p><span className="font-medium">货币:</span> {whoisData.price.currency_symbol}{whoisData.price.currency}</p>
                  </div>
                  <div>
                    <p><span className="font-medium">注册价格:</span> {whoisData.price.currency_symbol}{whoisData.price.new}</p>
                    <p><span className="font-medium">续费价格:</span> {whoisData.price.currency_symbol}{whoisData.price.renew}</p>
                  </div>
                </div>
              </div>
            )}
            
            <div>
              <h3 className="text-lg font-semibold mb-2 flex items-center">
                <InfoIcon className="h-4 w-4 mr-2" />
                原始 WHOIS 数据
              </h3>
              <pre className="whitespace-pre-wrap text-sm text-gray-700 overflow-auto bg-gray-50 p-4 rounded border">
                {whoisData.rawData}
              </pre>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Index;
