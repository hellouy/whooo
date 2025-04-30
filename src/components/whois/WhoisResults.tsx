
import { Card } from "@/components/ui/card";
import { CheckCircleIcon, InfoIcon, CalendarIcon, ServerIcon, BuildingIcon, ShieldIcon, AlertCircleIcon, XIcon, FlagIcon, LockIcon } from "lucide-react";
import { format, differenceInYears, differenceInMonths, isValid, parse } from "date-fns";
import { zhCN } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";

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
  message?: string;
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

  // 检查域名是否已注册（通过分析WHOIS数据确定）
  const isRegistered = !data.rawData.match(/(?:No match for|No entries found|Domain not found|NOT FOUND|AVAILABLE|No Data Found)/i);
  
  // 检查域名是否被保留
  const isReserved = data.rawData.match(/(?:reserved|保留|禁止注册|cannot be registered)/i) !== null;

  // 尝试解析创建日期
  const parsedCreationDate = parseFlexibleDate(data.registrationDate);
  const parsedExpiryDate = parseFlexibleDate(data.expiryDate);
  
  // 计算域名年龄
  const domainAge = isValid(parsedCreationDate) ? 
    differenceInYears(new Date(), parsedCreationDate) : null;
  
  // 检查是否为新注册域名（小于3个月）
  const isNewDomain = isValid(parsedCreationDate) ? 
    differenceInMonths(new Date(), parsedCreationDate) < 3 : false;

  // 尝试格式化日期
  const formatDate = (dateStr: string) => {
    if (dateStr === "未知") return "未知";
    
    try {
      const parsedDate = parseFlexibleDate(dateStr);
      if (isValid(parsedDate)) {
        return format(parsedDate, 'yyyy年MM月dd日 HH:mm:ss', { locale: zhCN });
      }
      return dateStr;
    } catch (error) {
      console.error("Date format error:", error);
      return dateStr;
    }
  };

  // 更灵活的日期解析函数
  function parseFlexibleDate(dateStr: string): Date {
    if (!dateStr || dateStr === "未知") return new Date(NaN);

    try {
      // 尝试作为ISO格式解析
      const isoDate = new Date(dateStr);
      if (isValid(isoDate)) return isoDate;

      // 尝试各种常见格式
      const formats = [
        'yyyy-MM-dd',
        'yyyy/MM/dd',
        'dd-MM-yyyy',
        'dd/MM/yyyy',
        'yyyy.MM.dd',
        'dd.MM.yyyy',
        'yyyy-MM-dd HH:mm:ss',
        'yyyy/MM/dd HH:mm:ss',
        'dd-MMM-yyyy',
        'yyyyMMdd'
      ];

      for (const fmt of formats) {
        try {
          const parsedDate = parse(dateStr, fmt, new Date());
          if (isValid(parsedDate)) return parsedDate;
        } catch (e) {
          // 继续尝试下一个格式
        }
      }

      // 尝试从字符串中提取日期
      const dateMatch = dateStr.match(/(\d{4})[-\/\.](\d{1,2})[-\/\.](\d{1,2})/);
      if (dateMatch) {
        const [_, year, month, day] = dateMatch;
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      }

      return new Date(NaN);
    } catch (error) {
      console.error("Date parsing error:", error);
      return new Date(NaN);
    }
  }

  // 获取域名年龄标签
  const getDomainAgeLabel = () => {
    if (!isRegistered) return null;
    
    if (isNewDomain) {
      return <Badge className="bg-blue-500 text-white">新注册域名</Badge>;
    } else if (domainAge !== null) {
      if (domainAge >= 10) {
        return <Badge className="bg-purple-600 text-white">10年老米</Badge>;
      } else if (domainAge >= 5) {
        return <Badge className="bg-indigo-500 text-white">5年老米</Badge>;
      } else if (domainAge >= 2) {
        return <Badge className="bg-green-500 text-white">2年域名</Badge>;
      } else {
        return <Badge className="bg-green-400 text-white">1年域名</Badge>;
      }
    }
    return null;
  };

  // 获取域名状态标签
  const getDomainStatusLabel = () => {
    if (!isRegistered) {
      if (isReserved) {
        return <Badge className="bg-yellow-500 text-white">域名已被保留</Badge>;
      }
      return <Badge className="bg-gray-500 text-white">域名未注册</Badge>;
    }

    // 其他可能的状态标签
    if (data.status.toLowerCase().includes("transfer prohibited") || 
        data.status.toLowerCase().includes("clienttransferprohibited")) {
      return <Badge className="bg-orange-500 text-white">禁止转移</Badge>;
    }
    
    if (data.status.toLowerCase().includes("pendingdelete")) {
      return <Badge className="bg-red-500 text-white">即将删除</Badge>;
    }
    
    return null;
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
      "clientTransferProhibited": "注册商禁止转移",
      "clientUpdateProhibited": "注册商禁止更新",
      "clientDeleteProhibited": "注册商禁止删除",
      "clientHold": "注册商暂停解析",
      "serverTransferProhibited": "服务器禁止转移",
      "serverUpdateProhibited": "服务器禁止更新",
      "serverDeleteProhibited": "服务器禁止删除",
      "serverHold": "服务器暂停解析",
      "active": "正常",
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
      "clientRenewProhibited": "注册商禁止续费",
      "autoRenewPeriod": "自动续费期",
      "transferPeriod": "转移期",
      "addPeriod": "新增期",
      "locked": "已锁定",
      "reserved": "已保留",
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
      "clientTransferProhibited": "注册商禁止转移",
      "clientUpdateProhibited": "注册商禁止更新",
      "clientDeleteProhibited": "注册商禁止删除",
      "clientHold": "注册商暂停解析",
      "serverTransferProhibited": "服务器禁止转移",
      "serverUpdateProhibited": "服务器禁止更新",
      "serverDeleteProhibited": "服务器禁止删除",
      "serverHold": "服务器暂停解析",
      "active": "正常",
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
      "clientRenewProhibited": "注册商禁止续费",
      "autoRenewPeriod": "自动续费期",
      "transferPeriod": "转移期",
      "addPeriod": "新增期",
      "locked": "已锁定",
      "reserved": "已保留",
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

  // 获取域名状态图标
  const getStatusIcon = () => {
    if (!isRegistered) {
      return <XIcon className="h-5 w-5 mr-2 text-gray-500" />;
    }
    
    if (data.status.toLowerCase().includes("transfer prohibited") || 
        data.status.toLowerCase().includes("clienttransferprohibited")) {
      return <LockIcon className="h-5 w-5 mr-2 text-orange-500" />;
    }
    
    if (data.status.toLowerCase().includes("pendingdelete")) {
      return <FlagIcon className="h-5 w-5 mr-2 text-red-500" />;
    }
    
    return <CheckCircleIcon className="h-5 w-5 mr-2 text-green-600" />;
  };

  // 生成域名状态信息
  const renderDomainStatus = () => {
    if (!isRegistered) {
      return (
        <Card className="p-6 bg-white border-2 border-gray-200 mb-4">
          <div className="text-center">
            {isReserved ? (
              <>
                <AlertCircleIcon className="h-12 w-12 mx-auto text-yellow-500 mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">域名已被保留</h2>
                <p className="text-gray-600">该域名目前被保留，无法注册。</p>
              </>
            ) : (
              <>
                <XIcon className="h-12 w-12 mx-auto text-gray-500 mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">域名尚未注册</h2>
                <p className="text-gray-600">该域名目前可供注册。</p>
              </>
            )}
          </div>
        </Card>
      );
    }
    
    return null;
  };

  return (
    <div className="space-y-4">
      <Card className="p-6 bg-white border-2 border-gray-200">
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              {getStatusIcon()}
              <span className="text-black">{data.domain}</span> 的 WHOIS 信息
            </h2>
            <div className="flex gap-2">
              {getDomainAgeLabel()}
              {getDomainStatusLabel()}
            </div>
          </div>
          <p className="text-sm text-gray-700">WHOIS服务器: <span className="font-medium">{data.whoisServer}</span></p>
          {!hasValidData && isRegistered && (
            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-800 text-sm">
              系统无法解析出详细的WHOIS信息，请查看下方原始数据获取更多信息。
            </div>
          )}
        </div>
        
        {renderDomainStatus()}
        
        {isRegistered && (
          <>
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                <h3 className="text-lg font-semibold mb-3 flex items-center text-gray-900">
                  <BuildingIcon className="h-4 w-4 mr-2 text-blue-600" />
                  基本信息
                </h3>
                <div className="space-y-3 text-gray-800">
                  <p><span className="font-medium text-gray-900">注册商:</span> {data.registrar}</p>
                  <p className="flex items-center">
                    <CalendarIcon className="h-4 w-4 mr-1 text-gray-700" />
                    <span className="font-medium text-gray-900">创建日期:</span> {formatDate(data.registrationDate)}
                  </p>
                  <p className="flex items-center">
                    <CalendarIcon className="h-4 w-4 mr-1 text-gray-700" />
                    <span className="font-medium text-gray-900">到期日期:</span> {formatDate(data.expiryDate)}
                  </p>
                  <p className="flex items-center">
                    <ShieldIcon className="h-4 w-4 mr-1 text-gray-700" />
                    <span className="font-medium text-gray-900">状态:</span> {formatStatus(data.status)}
                  </p>
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                <h3 className="text-lg font-semibold mb-3 flex items-center text-gray-900">
                  <ServerIcon className="h-4 w-4 mr-2 text-blue-600" />
                  名称服务器
                </h3>
                <div className="space-y-2 text-gray-800">
                  {formattedNameServers && formattedNameServers.length > 0 ? (
                    formattedNameServers.map((ns: string, index: number) => (
                      <p key={index} className="flex items-center">
                        <ServerIcon className="h-3 w-3 mr-1 text-gray-700" />
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
              <div className="mb-6 bg-blue-50 p-4 rounded-lg border border-blue-100">
                <h3 className="text-lg font-semibold mb-2 flex items-center text-gray-900">
                  <InfoIcon className="h-4 w-4 mr-2 text-blue-600" />
                  价格信息
                </h3>
                <div className="grid grid-cols-2 gap-4 text-gray-800">
                  <div>
                    <p><span className="font-medium text-gray-900">货币:</span> {data.price.currency_symbol}{data.price.currency}</p>
                  </div>
                  <div>
                    <p><span className="font-medium text-gray-900">注册价格:</span> {data.price.currency_symbol}{data.price.new}</p>
                    <p><span className="font-medium text-gray-900">续费价格:</span> {data.price.currency_symbol}{data.price.renew}</p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        
        <div>
          <h3 className="text-lg font-semibold mb-2 flex items-center text-gray-900">
            <InfoIcon className="h-4 w-4 mr-2 text-blue-600" />
            原始 WHOIS 数据
          </h3>
          <pre className="whitespace-pre-wrap text-sm text-gray-900 overflow-auto bg-gray-50 p-4 rounded border max-h-96 font-mono">
            {data.rawData || "无原始WHOIS数据"}
          </pre>
        </div>
      </Card>
    </div>
  );
};
