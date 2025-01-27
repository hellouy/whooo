import { useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const [domain, setDomain] = useState("");
  const [whoisData, setWhoisData] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleWhoisLookup = async () => {
    if (!domain) {
      toast({
        title: "错误",
        description: "请输入域名",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // 使用 WHOIS API 服务
      const response = await axios.get(`https://whois.frapsoft.com/v1/${domain}`);
      console.log("WHOIS Response:", response.data); // 添加日志以便调试
      
      if (response.data && typeof response.data === 'object') {
        // 格式化 WHOIS 数据以便显示
        const formattedData = JSON.stringify(response.data, null, 2);
        setWhoisData(formattedData);
        
        toast({
          title: "查询成功",
          description: "已获取域名信息",
        });
      } else {
        throw new Error("Invalid response format");
      }
    } catch (error) {
      console.error("Whois lookup error:", error);
      toast({
        title: "查询失败",
        description: "无法获取域名信息，请稍后重试",
        variant: "destructive",
      });
      setWhoisData(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Whois 域名查询
          </h1>
          <p className="text-gray-600">
            输入域名查询注册信息
          </p>
        </div>

        <div className="flex gap-4 mb-8">
          <Input
            type="text"
            placeholder="请输入域名 (例如: example.com)"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            className="flex-1"
          />
          <Button 
            onClick={handleWhoisLookup}
            disabled={loading}
          >
            {loading ? "查询中..." : "查询"}
          </Button>
        </div>

        {whoisData && (
          <Card className="p-6">
            <pre className="whitespace-pre-wrap text-sm text-gray-700 overflow-auto">
              {whoisData}
            </pre>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Index;