
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

  // 更可靠的域名注册状态检测 - 检查特定模式和有效数据
  const isRegistered = (() => {
    // 如果状态显式表示已注册或有基本注册信息，则认为已注册
    if (data.status === "已注册" || data.registrar !== "未知" || data.registrationDate !== "未知" || data.nameServers.length > 0) {
      return true;
    }

    // 检查状态是否明确表示未注册
    if (data.status === "未注册") {
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
      /domain not registered/i
    ];
    
    // 如果匹配任何未注册的模式，认为未注册
    if (notRegisteredPatterns.some(pattern => pattern.test(data.rawData))) {
      return false;
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
      /client transfer prohibited/i
    ];
    
    return registeredPatterns.some(pattern => pattern.test(data.rawData));
  })();
  
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
    if (status.includes(',')) {
      const statuses = status.split(',').map(s => s.trim());
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
    
    return statusArray.map(status => statusMap[status] || status).join(", ");
  };

  // 返回结果组件
  return (
    <Card className="overflow-hidden">
      <div className="p-6 bg-white">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center">
            {data.domain}
            <span className="ml-2">
              {isRegistered ? (
                <CheckCircleIcon className="h-6 w-6 text-green-500" />
              ) : (
                <XIcon className="h-6 w-6 text-red-500" />
              )}
            </span>
          </h2>
          <div className="flex gap-2 items-center">
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
                {data.nameServers.length > 0 ? (
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
            原始 WHOIS 数据
          </div>
          <pre className="bg-gray-50 p-4 rounded-md overflow-x-auto text-xs font-mono whitespace-pre-wrap">
            {data.rawData}
          </pre>
        </div>
      </div>
    </Card>
  );
};
