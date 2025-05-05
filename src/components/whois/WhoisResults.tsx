import { Card } from "@/components/ui/card";
import { CheckCircleIcon, InfoIcon, CalendarIcon, ServerIcon, BuildingIcon, ShieldIcon, AlertCircleIcon, XIcon, FlagIcon, LockIcon } from "lucide-react";
import { format, differenceInYears, differenceInMonths, isValid, parse } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { WhoisData } from "@/hooks/use-whois-lookup";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// 域名状态码翻译
function translateDomainStatus(status: string): string {
  const translations: Record<string, string> = {
    "clientDeleteProhibited": "客户端禁止删除",
    "clientTransferProhibited": "客户端禁止转移",
    "clientUpdateProhibited": "客户端禁止更新",
    "serverDeleteProhibited": "服务器禁止删除",
    "serverTransferProhibited": "服务器禁止转移",
    "serverUpdateProhibited": "服务器禁止更新",
    "addPeriod": "添加期",
    "autoRenewPeriod": "自动续费期",
    "inactive": "不活跃",
    "ok": "正常",
    "pendingCreate": "待创建",
    "pendingDelete": "待删除",
    "pendingRenew": "待续费",
    "pendingRestore": "待恢复",
    "pendingTransfer": "待转移",
    "pendingUpdate": "待更新",
    "redemptionPeriod": "赎回期",
    "renewPeriod": "续费期",
    "serverHold": "服务器暂停",
    "transferPeriod": "转移期"
  };
  
  return translations[status] || status;
}

interface WhoisResultsProps {
  data: WhoisData;
}

// 格式化域名状态信息，便于显示
function formatStatus(status: string): string {
  if (!status || status === "未知") return "未知";
  
  try {
    // 如果是JSON字符串，尝试解析
    if (status.startsWith('[') || status.startsWith('{')) {
      try {
        const parsed = JSON.parse(status);
        if (Array.isArray(parsed)) {
          return parsed.join(", ");
        } else {
          return JSON.stringify(parsed);
        }
      } catch (e) {
        // 解析失败，按原样返回
        return status;
      }
    }
    
    // 尝试使用翻译函数
    const translated = translateDomainStatus(status);
    if (translated !== status) {
      return translated;
    }
    
    // 处理多行状态
    if (status.includes("\n")) {
      return status.split("\n").join(", ");
    }
    
    // 处理多个状态描述
    if (status.includes(",")) {
      const parts = status.split(",").map(part => part.trim());
      return parts.join(", ");
    }
    
    return status;
  } catch (error) {
    console.error("格式化状态错误:", error);
    return status;
  }
}

export const WhoisResults = ({ data }: WhoisResultsProps) => {
  // 检查是否有有效数据（不全是"未知"）
  const hasValidData = 
    data.registrar !== "未知" || 
    data.registrationDate !== "未知" || 
    data.expiryDate !== "未知" || 
    data.status !== "未知" ||
    data.nameServers.length > 0;

  // 改进的域名注册状态检测
  const isRegistered = (() => {
    // 如果有明确的错误消息表明查询失败，无法确定状态
    if (data.protocol === 'error') return null;
    
    // 如果状态明确表示已注��或有明确的注册信息，则认为已注册
    if (data.protocol === 'rdap') return true; // RDAP协议只返回已注册的域名信息
    
    if (data.status === "已注册" || 
        data.registrar !== "未知" || 
        data.registrationDate !== "未知" || 
        (data.nameServers && data.nameServers.length > 0)) {
      return true;
    }

    // 检查状态是否明确表示未注册
    if (data.status === "未注册" || 
        data.status?.toLowerCase().includes("available") ||
        data.status?.toLowerCase().includes("free") ||
        data.status?.toLowerCase().includes("not found")) {
      return false;
    }

    // 检查原始数据中是否有表示未注册的常见提示
    const notRegisteredPatterns = [
      /no match for/i,
      /not found/i,
      /no entries found/i,
      /domain not found/i,
      /no data found/i,
      /domain available/i,
      /available for registration/i,
      /not registered/i,
      /status:\s*available/i,
      /status:\s*free/i,
      /no information found/i,
      /domain is free/i,
      /domain not registered/i,
      /^no match/i,
      /^not found/i,
      /^no data/i,
      /domain is available/i,
      /查询不到该域名信息/i
    ];
    
    // 如果匹配任何未注册的模式，认为未注册
    if (data.rawData && notRegisteredPatterns.some(pattern => pattern.test(data.rawData))) {
      return false;
    }
    
    // 如果有明确表示已注册的字段
    const registeredFields = [
      data.registrar !== "未知" && data.registrar !== "Unknown",
      data.registrationDate !== "未知" && data.registrationDate !== "Unknown",
      data.nameServers && data.nameServers.length > 0
    ];
    
    // 如果有至少两个字段表明域名已注册
    if (registeredFields.filter(Boolean).length >= 2) {
      return true;
    }
    
    // 检查是否有明确表示已注册的模式
    const registeredPatterns = [
      /domain name:/i,
      /registrar:/i,
      /creation date:/i,
      /registrant:/i,
      /registered/i,
      /name server:/i,
      /registration date:/i,
      /client transfer prohibited/i,
      /Sponsoring Registrar/i,
      /Domain Status:/i
    ];
    
    // 如果匹配至少三个已注册模式，认为已注册
    const matchCount = registeredPatterns.reduce(
      (count, pattern) => count + (data.rawData && pattern.test(data.rawData) ? 1 : 0), 
      0
    );
    
    return matchCount >= 3;
  })();
  
  // 检查域名是否被保留或溢价
  const isReserved = data.rawData && /(?:reserved|保留|禁止注册|cannot be registered|premium|premium domain)/i.test(data.rawData);
  
  // 如果域名状态不明确，检查原始数据中是否有特定字符串
  const isUnknownStatus = isRegistered === null;

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
    if (!dateStr || dateStr === "未知" || dateStr === "Unknown") return "未知";
    
    try {
      const parsedDate = parseFlexibleDate(dateStr);
      if (isValid(parsedDate)) {
        return format(parsedDate, 'yyyy年MM月dd日 HH:mm:ss');
      }
      return dateStr;
    } catch (error) {
      console.error("Date format error:", error);
      return dateStr;
    }
  };

  // 更灵活的日期解析函数
  function parseFlexibleDate(dateStr: string): Date {
    if (!dateStr || dateStr === "未知" || dateStr === "Unknown") return new Date(NaN);

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
        'MMM dd yyyy',
        'yyyyMMdd',
        'yyyy-MM-ddTHH:mm:ssZ',
        'yyyy-MM-ddTHH:mm:ss.SSSZ'
      ];

      for (const fmt of formats) {
        try {
          const parsedDate = parse(dateStr, fmt, new Date());
          if (isValid(parsedDate)) return parsedDate;
        } catch (e) {
          // 继续尝试下一个格式
        }
      }

      // 尝试从字符串中提取日期，匹配更多模式
      const datePatterns = [
        /(\d{4})[-\/\.](\d{1,2})[-\/\.](\d{1,2})/,  // YYYY-MM-DD
        /(\d{1,2})[-\/\.](\d{1,2})[-\/\.](\d{4})/,  // DD-MM-YYYY or MM-DD-YYYY
        /(\d{4})(\d{2})(\d{2})/                    // YYYYMMDD
      ];
      
      for (const pattern of datePatterns) {
        const match = dateStr.match(pattern);
        if (match) {
          // 根据模式的不同调整年月日的位置
          if (pattern.toString().startsWith('/\\d{4}')) {
            // YYYY-MM-DD pattern
            const [_, year, month, day] = match;
            return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          } else if (pattern.toString().startsWith('/\\d{1,2}')) {
            // Try both DD-MM-YYYY and MM-DD-YYYY interpretations
            // This is an approximation - without locale information we can't be sure
            const [_, first, second, year] = match;
            // Try as DD-MM-YYYY first (common outside USA)
            const asDay = new Date(parseInt(year), parseInt(second) - 1, parseInt(first));
            // If day seems valid, use that interpretation
            if (asDay.getDate() === parseInt(first)) return asDay;
            // Otherwise try MM-DD-YYYY (USA format)
            return new Date(parseInt(year), parseInt(first) - 1, parseInt(second));
          } else if (pattern.toString().includes('YYYYMMDD')) {
            // YYYYMMDD pattern
            const [_, year, month, day] = match;
            return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          }
        }
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
      if (domainAge >= 20) {
        return <Badge className="bg-purple-700 text-white">20年老域名</Badge>;
      } else if (domainAge >= 15) {
        return <Badge className="bg-purple-600 text-white">15年老域名</Badge>;
      } else if (domainAge >= 10) {
        return <Badge className="bg-purple-500 text-white">10年老域名</Badge>;
      } else if (domainAge >= 5) {
        return <Badge className="bg-indigo-500 text-white">5年域名</Badge>;
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
    if (isUnknownStatus) {
      return <Badge className="bg-gray-400 text-white">状态不明</Badge>;
    }
    
    if (isRegistered === false) {
      if (isReserved) {
        return <Badge className="bg-yellow-500 text-white">域名已保留</Badge>;
      }
      return <Badge className="bg-green-500 text-white">域名未注册</Badge>;
    }

    // 其他可能的状态标签
    if (data.status && data.status.toLowerCase().includes("transfer prohibited") || 
        data.status && data.status.toLowerCase().includes("clienttransferprohibited")) {
      return <Badge className="bg-orange-500 text-white">禁止转移</Badge>;
    }
    
    if (data.status && data.status.toLowerCase().includes("pendingdelete")) {
      return <Badge className="bg-red-500 text-white">即将删除</Badge>;
    }
    
    if (data.protocol === 'rdap') {
      return <Badge className="bg-blue-500 text-white">RDAP数据</Badge>;
    }
    
    return null;
  };

  // 显示查询协议信息
  const getProtocolDisplay = () => {
    if (!data.protocol) return null;
    
    const protocolLabels: Record<string, {label: string, className: string}> = {
      'rdap': {label: 'RDAP 协议', className: 'bg-blue-500 text-white'},
      'whois': {label: 'WHOIS 协议', className: 'bg-indigo-500 text-white'},
      'error': {label: '查询错误', className: 'bg-red-500 text-white'}
    };
    
    const protocolInfo = protocolLabels[data.protocol] || {label: '未知协议', className: 'bg-gray-500 text-white'};
    
    return <Badge className={protocolInfo.className}>{protocolInfo.label}</Badge>;
  };

  // 返回结果组件
  return (
    <Card className="overflow-hidden">
      <div className="p-6 bg-white">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center">
            {data.domain}
            <span className="ml-2">
              {isRegistered === true ? (
                <CheckCircleIcon className="h-6 w-6 text-green-500" />
              ) : isRegistered === false ? (
                <XIcon className="h-6 w-6 text-red-500" />
              ) : (
                <AlertCircleIcon className="h-6 w-6 text-yellow-500" />
              )}
            </span>
          </h2>
          <div className="flex gap-2 items-center">
            {getProtocolDisplay()}
            {getDomainAgeLabel()}
            {getDomainStatusLabel()}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="mb-4">
              <div className="flex items-center text-gray-700 font-medium mb-1">
                <BuildingIcon className="h-4 w-4 mr-2" />
                注册商
              </div>
              <p className="text-gray-800">{data.registrar}</p>
            </div>

            <div className="mb-4">
              <div className="flex items-center text-gray-700 font-medium mb-1">
                <CalendarIcon className="h-4 w-4 mr-2" />
                注册日期
              </div>
              <p className="text-gray-800">{formatDate(data.registrationDate)}</p>
            </div>

            <div className="mb-4">
              <div className="flex items-center text-gray-700 font-medium mb-1">
                <CalendarIcon className="h-4 w-4 mr-2" />
                到期日期
              </div>
              <p className="text-gray-800">{formatDate(data.expiryDate)}</p>
            </div>
          </div>

          <div>
            <div className="mb-4">
              <div className="flex items-center text-gray-700 font-medium mb-1">
                <ServerIcon className="h-4 w-4 mr-2" />
                WHOIS服务器
              </div>
              <p className="text-gray-800">{data.whoisServer}</p>
            </div>

            <div className="mb-4">
              <div className="flex items-center text-gray-700 font-medium mb-1">
                <ShieldIcon className="h-4 w-4 mr-2" />
                域名状态
              </div>
              <p className="text-gray-800">{formatStatus(data.status)}</p>
            </div>

            <div>
              <div className="flex items-center text-gray-700 font-medium mb-1">
                <InfoIcon className="h-4 w-4 mr-2" />
                域名服务器
              </div>
              <div className="text-gray-800">
                {data.nameServers && data.nameServers.length > 0 ? (
                  data.nameServers.map((ns, index) => (
                    <div key={index} className="text-sm font-mono">
                      {ns}
                    </div>
                  ))
                ) : (
                  <p>未找到域名服务器</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <div className="flex items-center text-gray-700 font-medium mb-2">
            <InfoIcon className="h-4 w-4 mr-2" />
            原始数据
          </div>
          <pre className="bg-gray-50 p-4 rounded-md overflow-x-auto text-xs font-mono whitespace-pre-wrap">
            {data.rawData}
          </pre>
        </div>

        {data.message && (
          <div className="mt-4 text-sm text-gray-500 italic">
            {data.message}
          </div>
        )}
      </div>
    </Card>
  );
};
