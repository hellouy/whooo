
import { Card } from "@/components/ui/card";
import { CheckCircleIcon, InfoIcon, CalendarIcon, ServerIcon, BuildingIcon, ShieldIcon } from "lucide-react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";

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

  // 尝试格式化日期
  const formatDate = (dateStr: string) => {
    if (dateStr === "未知") return "未知";
    
    try {
      // 处理常见的日期格式
      // 1. 标准 ISO 格式 (2023-06-05T15:30:00Z)
      if (dateStr.includes('T') && dateStr.includes('Z')) {
        return format(new Date(dateStr), 'yyyy年MM月dd日 HH:mm:ss', { locale: zhCN });
      }
      
      // 2. 简单日期格式 (2023-06-05)
      if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return format(new Date(dateStr), 'yyyy年MM月dd日', { locale: zhCN });
      }
      
      // 3. 带时间的格式 (2023-06-05 15:30:00)
      if (dateStr.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)) {
        return format(new Date(dateStr), 'yyyy年MM月dd日 HH:mm:ss', { locale: zhCN });
      }
      
      // 4. 纯数字格式 (20230605)
      if (dateStr.match(/^\d{8}$/)) {
        const year = dateStr.substring(0, 4);
        const month = dateStr.substring(4, 6);
        const day = dateStr.substring(6, 8);
        return `${year}年${month}月${day}日`;
      }
      
      // 其他格式直接返回
      return dateStr;
    } catch (error) {
      console.error("Date format error:", error);
      return dateStr;
    }
  };

  // 处理状态显示
  const formatStatus = (status: string) => {
    if (status === "未知") return "未知";
    
    // 如果状态是数组，合并显示
    if (Array.isArray(status)) {
      return formatStatusArray(status);
    }
    
    // 常见的状态映射为中文
    const statusMap: Record<string, string> = {
      "clientTransferProhibited": "禁止转移",
      "clientUpdateProhibited": "禁止更新",
      "clientDeleteProhibited": "禁止删除",
      "clientHold": "暂停解析",
      "serverTransferProhibited": "服务器禁止转移",
      "serverUpdateProhibited": "服务器禁止更新",
      "serverDeleteProhibited": "服务器禁止删除",
      "serverHold": "服务器暂停解析",
      "active": "活跃",
      "inactive": "不活跃",
      "ok": "正常",
      "pending": "待处理",
      "pendingDelete": "待删除",
      "pendingTransfer": "待转移",
      "pendingUpdate": "待更新",
      "pendingRenew": "待续费",
      "pendingRestore": "待恢复",
      "redemptionPeriod": "赎回期",
      "renewPeriod": "续费期",
      "serverRenewProhibited": "服务器禁止续费",
      "clientRenewProhibited": "禁止续费",
    };
    
    // 处理多个状态的情况
    if (status.includes(",")) {
      const statuses = status.split(",").map(s => s.trim());
      return statuses.map(s => statusMap[s] || s).join(", ");
    }
    
    return statusMap[status.trim()] || status;
  };
  
  // 处理状态数组
  const formatStatusArray = (statusArray: string[]) => {
    if (!statusArray || statusArray.length === 0) return "未知";
    
    const statusMap: Record<string, string> = {
      "clientTransferProhibited": "禁止转移",
      "clientUpdateProhibited": "禁止更新",
      "clientDeleteProhibited": "禁止删除",
      "clientHold": "暂停解析",
      "serverTransferProhibited": "服务器禁止转移",
      "serverUpdateProhibited": "服务器禁止更新",
      "serverDeleteProhibited": "服务器禁止删除",
      "serverHold": "服务器暂停解析",
      "active": "活跃",
      "inactive": "不活跃",
      "ok": "正常",
      "pending": "待处理",
      "pendingDelete": "待删除",
      "pendingTransfer": "待转移",
      "pendingUpdate": "待更新",
      "pendingRenew": "待续费",
      "pendingRestore": "待恢复",
      "redemptionPeriod": "赎回期",
      "renewPeriod": "续费期",
      "serverRenewProhibited": "服务器禁止续费",
      "clientRenewProhibited": "禁止续费",
    };
    
    return statusArray.map(status => {
      const cleanStatus = status.replace(/^(ok )?https?:\/\/.*$/, "ok").trim();
      return statusMap[cleanStatus] || cleanStatus;
    }).join(", ");
  };

  // 处理名称服务器列表
  const formatNameServers = (nameServers: string[] | string) => {
    if (!nameServers || (Array.isArray(nameServers) && nameServers.length === 0)) {
      return [];
    }
    
    if (typeof nameServers === 'string') {
      return nameServers.split(/[,\s]+/).filter(Boolean);
    }
    
    return nameServers;
  };

  // 获取格式化后的名称服务器列表
  const formattedNameServers = formatNameServers(data.nameServers);

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
            <BuildingIcon className="h-4 w-4 mr-2" />
            基本信息
          </h3>
          <div className="space-y-2">
            <p><span className="font-medium">注册商:</span> {data.registrar}</p>
            <p className="flex items-center">
              <CalendarIcon className="h-4 w-4 mr-1 text-gray-500" />
              <span className="font-medium">创建日期:</span> {formatDate(data.registrationDate)}
            </p>
            <p className="flex items-center">
              <CalendarIcon className="h-4 w-4 mr-1 text-gray-500" />
              <span className="font-medium">到期日期:</span> {formatDate(data.expiryDate)}
            </p>
            <p className="flex items-center">
              <ShieldIcon className="h-4 w-4 mr-1 text-gray-500" />
              <span className="font-medium">状态:</span> {formatStatus(data.status)}
            </p>
          </div>
        </div>
        
        <div>
          <h3 className="text-lg font-semibold mb-2 flex items-center">
            <ServerIcon className="h-4 w-4 mr-2" />
            名称服务器
          </h3>
          <div className="space-y-1">
            {formattedNameServers && formattedNameServers.length > 0 ? (
              formattedNameServers.map((ns: string, index: number) => (
                <p key={index} className="flex items-center">
                  <ServerIcon className="h-3 w-3 mr-1 text-gray-400" />
                  {ns}
                </p>
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
