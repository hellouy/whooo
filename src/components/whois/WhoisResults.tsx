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
function formatStatus(status: unknown): string {
  if (!status || status === "未知") return "未知";
  
  try {
    // 确保status是字符串类型
    if (typeof status !== 'string') {
      return String(status);
    }
    
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
    return String(status);
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
    
    // 如果状态明确表示已注册或有明确的注册信息，则认为已注册
    if (data.protocol === 'rdap') return true; // RDAP协议只返回已注册的域名信息
    
    if (data.status === "已注册" || 
        data.registrar !== "未知" || 
        data.registrationDate !== "未知" || 
        (data.nameServers && data.nameServers.length > 0)) {
      return true;
    }

    // 检查状态是否明确表示未注册
    if (data.status === "未注册" || 
        (typeof data.status === 'string' && data.status.toLowerCase().includes("available")) ||
        (typeof data.status === 'string' && data.status.toLowerCase().includes("free")) ||
        (typeof data.status === 'string' && data.status.toLowerCase().includes("not found"))) {
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
    if (data.rawData && typeof data.rawData === 'string' && 
        notRegisteredPatterns.some(pattern => pattern.test(data.rawData as string))) {
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
    const matchCount = typeof data.rawData === 'string' ? 
      registeredPatterns.reduce(
        (count, pattern) => count + (pattern.test(data.rawData as string) ? 1 : 0), 
        0
      ) : 0;
    
    return matchCount >= 3;
  })();
  
  // 检查域名是否被保留或溢价
  const isReserved = (() => {
    if (!data.rawData || typeof data.rawData !== 'string') return false;
    
    const reservedPatterns = [
      /reserved/i,
      /premium/i,
      /protected/i,
      /registry reserved/i,
      /reserved by registry/i,
      /registry hold/i,
      /reserved name/i
    ];
    
    return reservedPatterns.some(pattern => pattern.test(data.rawData as string));
  })();

  // 渲染状态标签
  const renderStatusBadge = () => {
    // 如果查询失败
    if (data.protocol === 'error') {
      return <Badge variant="destructive">查询失败</Badge>;
    }
    
    // 如果是已注册
    if (isRegistered === true) {
      return <Badge className="bg-green-500 text-white">已注册</Badge>;
    }
    
    // 如果明确未注册
    if (isRegistered === false) {
      return <Badge className="bg-blue-500 text-white">未注册</Badge>;
    }
    
    // 如果是保留域名
    if (isReserved) {
      return <Badge className="bg-purple-500 text-white">保留域名</Badge>;
    }

    // 其他可能的状态标签
    if (typeof data.status === 'string') {
      if (data.status.toLowerCase().includes("transfer prohibited") || 
          data.status.toLowerCase().includes("clienttransferprohibited")) {
        return <Badge className="bg-orange-500 text-white">禁止转移</Badge>;
      }
      
      if (data.status.toLowerCase().includes("pendingdelete")) {
        return <Badge className="bg-red-500 text-white">即将删除</Badge>;
      }
    }
    
    // 默认状态
    return <Badge variant="outline">未知状态</Badge>;
  };

  // 计算剩余时间
  const calculateTimeRemaining = (dateStr: string) => {
    if (dateStr === "未知" || dateStr === "Unknown") return null;
    
    try {
      // 尝试解析日期
      let expiryDate = null;
      
      // 尝试不同的日期格式
      const dateFormats = [
        "yyyy-MM-dd",
        "yyyy-MM-dd'T'HH:mm:ss'Z'",
        "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
        "dd-MMM-yyyy",
        "dd.MM.yyyy",
        "MM/dd/yyyy",
        "yyyy/MM/dd"
      ];
      
      for (const format of dateFormats) {
        try {
          const parsedDate = parse(dateStr, format, new Date());
          if (isValid(parsedDate)) {
            expiryDate = parsedDate;
            break;
          }
        } catch {
          // 尝试下一个格式
          continue;
        }
      }
      
      // 如果无法解析，尝试直接创建日期对象
      if (!expiryDate) {
        expiryDate = new Date(dateStr);
      }
      
      // 如果日期有效
      if (expiryDate && isValid(expiryDate)) {
        const now = new Date();
        const years = differenceInYears(expiryDate, now);
        const months = differenceInMonths(expiryDate, now) % 12;
        
        if (expiryDate < now) {
          return "已过期";
        } else {
          return `${years}年${months}个月`;
        }
      }
      
      return null;
    } catch {
      return null;
    }
  };

  // 处理原始数据显示
  const formatRawData = (rawData: unknown) => {
    if (!rawData) return "没有原始数据";
    
    if (typeof rawData !== 'string') {
      try {
        return JSON.stringify(rawData, null, 2);
      } catch {
        return String(rawData);
      }
    }
    
    return rawData;
  };

  return (
    <Card className="p-4 mt-6">
      <div className="grid grid-cols-1 gap-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-bold">{data.domain}</h2>
          {renderStatusBadge()}
        </div>
        
        <Separator className="my-2" />
        
        {!hasValidData && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircleIcon className="h-4 w-4" />
            <AlertTitle>查询结果有限</AlertTitle>
            <AlertDescription>
              未能获取完整的域名信息，可能是因为域名未注册或查询受限。
            </AlertDescription>
          </Alert>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <BuildingIcon className="h-5 w-5 text-gray-500" />
              <div>
                <div className="text-sm font-medium">注册商</div>
                <div className="text-sm">{data.registrar}</div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-gray-500" />
              <div>
                <div className="text-sm font-medium">注册日期</div>
                <div className="text-sm">{data.registrationDate}</div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-gray-500" />
              <div>
                <div className="text-sm font-medium">到期日期</div>
                <div className="text-sm">
                  {data.expiryDate} 
                  {data.expiryDate !== "未知" && calculateTimeRemaining(data.expiryDate) && (
                    <span className="ml-2 text-xs text-gray-500">
                      (剩余 {calculateTimeRemaining(data.expiryDate)})
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <FlagIcon className="h-5 w-5 text-gray-500" />
              <div>
                <div className="text-sm font-medium">状态</div>
                <div className="text-sm">{formatStatus(data.status)}</div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <InfoIcon className="h-5 w-5 text-gray-500" />
              <div>
                <div className="text-sm font-medium">注册人</div>
                <div className="text-sm">{data.registrant || "未知"}</div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <ServerIcon className="h-5 w-5 text-gray-500" />
              <div>
                <div className="text-sm font-medium">WHOIS服务器</div>
                <div className="text-sm">{data.whoisServer}</div>
              </div>
            </div>
          </div>
        </div>
        
        {data.nameServers && data.nameServers.length > 0 && (
          <div className="mt-2">
            <div className="text-sm font-medium mb-1">名称服务器</div>
            <ul className="list-disc list-inside pl-2">
              {data.nameServers.map((ns, index) => (
                <li key={index} className="text-sm">{ns}</li>
              ))}
            </ul>
          </div>
        )}
        
        <Tabs defaultValue="raw" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="raw">原始数据</TabsTrigger>
            <TabsTrigger value="info">查询信息</TabsTrigger>
          </TabsList>
          
          <TabsContent value="raw">
            <div className="mt-2 p-2 bg-gray-100 rounded text-xs font-mono whitespace-pre-wrap overflow-x-auto max-h-60 overflow-y-auto">
              {formatRawData(data.rawData)}
            </div>
          </TabsContent>
          
          <TabsContent value="info">
            <div className="mt-2">
              <div className="mb-2">
                <span className="text-sm font-medium">查询协议: </span>
                <Badge variant="outline" className="ml-1">
                  {data.protocol === 'rdap' ? 'RDAP' : 
                   data.protocol === 'whois' ? 'WHOIS' : 
                   '查询失败'}
                </Badge>
              </div>
              
              {data.message && (
                <div className="text-sm text-gray-600 mb-2">
                  <span className="font-medium">消息: </span>
                  {data.message}
                </div>
              )}
              
              <div className="text-xs text-gray-500 mt-2">
                <p>查询时间: {new Date().toLocaleString()}</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Card>
  );
};
