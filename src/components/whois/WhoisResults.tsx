
import { Card } from "@/components/ui/card";
import { CheckCircleIcon, InfoIcon } from "lucide-react";

interface WhoisData {
  domain: string;
  whoisServer: string;
  registrar: string;
  registrationDate: string;
  expiryDate: string;
  nameServers: string[];
  registrant: string;
  status: string;
  rawData: string;
  price?: {
    currency: string;
    currency_symbol: string;
    new: string;
    renew: string;
  };
}

interface WhoisResultsProps {
  data: WhoisData;
}

export const WhoisResults = ({ data }: WhoisResultsProps) => {
  // 检查是否有有效数据（不全是"未知"）
  const hasValidData = 
    data.registrar !== "未知" || 
    data.registrationDate !== "未知" || 
    data.expiryDate !== "未知" || 
    data.status !== "未知" ||
    data.nameServers.length > 0;

  return (
    <Card className="p-6">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center">
          <CheckCircleIcon className="h-5 w-5 mr-2 text-green-500" />
          {data.domain} 的 WHOIS 信息
        </h2>
        <p className="text-sm text-gray-600">WHOIS服务器: {data.whoisServer}</p>
        {!hasValidData && (
          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-700 text-sm">
            系统无法解析出详细的WHOIS信息，请查看下方原始数据获取更多信息。
          </div>
        )}
      </div>
      
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <div>
          <h3 className="text-lg font-semibold mb-2 flex items-center">
            <InfoIcon className="h-4 w-4 mr-2" />
            基本信息
          </h3>
          <div className="space-y-2">
            <p><span className="font-medium">注册商:</span> {data.registrar}</p>
            <p><span className="font-medium">创建日期:</span> {data.registrationDate}</p>
            <p><span className="font-medium">到期日期:</span> {data.expiryDate}</p>
            <p><span className="font-medium">状态:</span> {data.status}</p>
          </div>
        </div>
        
        <div>
          <h3 className="text-lg font-semibold mb-2 flex items-center">
            <InfoIcon className="h-4 w-4 mr-2" />
            名称服务器
          </h3>
          <div className="space-y-1">
            {data.nameServers && data.nameServers.length > 0 ? (
              data.nameServers.map((ns: string, index: number) => (
                <p key={index}>{ns}</p>
              ))
            ) : (
              <p>无可用的名称服务器信息</p>
            )}
          </div>
        </div>
      </div>
      
      {data.price && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2 flex items-center">
            <InfoIcon className="h-4 w-4 mr-2" />
            价格信息
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p><span className="font-medium">货币:</span> {data.price.currency_symbol}{data.price.currency}</p>
            </div>
            <div>
              <p><span className="font-medium">注册价格:</span> {data.price.currency_symbol}{data.price.new}</p>
              <p><span className="font-medium">续费价格:</span> {data.price.currency_symbol}{data.price.renew}</p>
            </div>
          </div>
        </div>
      )}
      
      <div>
        <h3 className="text-lg font-semibold mb-2 flex items-center">
          <InfoIcon className="h-4 w-4 mr-2" />
          原始 WHOIS 数据
        </h3>
        <pre className="whitespace-pre-wrap text-sm text-gray-700 overflow-auto bg-gray-50 p-4 rounded border max-h-96">
          {data.rawData || "无原始WHOIS数据"}
        </pre>
      </div>
    </Card>
  );
};
