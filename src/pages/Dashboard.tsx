
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsLists, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Globe, Trash2, Edit, LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Domain = {
  id: string;
  name: string;
  registrationDate: Date;
  expirationDate: Date;
  status: "active" | "pending" | "expired" | "transferring";
};

const Dashboard = () => {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  
  // Mock domains data
  const [domains, setDomains] = useState<Domain[]>([
    {
      id: "dom_1",
      name: "example.com",
      registrationDate: new Date(2022, 0, 15),
      expirationDate: new Date(2024, 0, 15),
      status: "active"
    },
    {
      id: "dom_2",
      name: "mywebsite.net",
      registrationDate: new Date(2021, 5, 10),
      expirationDate: new Date(2023, 5, 10),
      status: "expired"
    },
    {
      id: "dom_3",
      name: "coolapp.io",
      registrationDate: new Date(2023, 2, 1),
      expirationDate: new Date(2025, 2, 1),
      status: "active"
    }
  ]);

  const handleDeleteDomain = (id: string) => {
    setDomains(domains.filter(domain => domain.id !== id));
    toast({
      title: "成功",
      description: "域名已删除",
    });
  };

  const getStatusColor = (status: Domain['status']) => {
    switch (status) {
      case "active": return "text-green-600 bg-green-100";
      case "pending": return "text-yellow-600 bg-yellow-100";
      case "expired": return "text-red-600 bg-red-100";
      case "transferring": return "text-blue-600 bg-blue-100";
      default: return "text-gray-600 bg-gray-100";
    }
  };

  const getStatusText = (status: Domain['status']) => {
    switch (status) {
      case "active": return "活跃";
      case "pending": return "待处理";
      case "expired": return "已过期";
      case "transferring": return "转移中";
      default: return status;
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">用户中心</h1>
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium">欢迎，{user?.username}</span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                logout();
                toast({
                  title: "成功",
                  description: "您已成功退出登录",
                });
              }}
            >
              <LogOut className="h-4 w-4 mr-2" />
              退出登录
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="domains">
          <TabsList className="mb-8">
            <TabsTrigger value="domains">我的域名</TabsTrigger>
            <TabsTrigger value="account">账户设置</TabsTrigger>
          </TabsList>
          
          <TabsContent value="domains">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-gray-900">域名管理</h2>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                添加域名
              </Button>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
              {domains.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">域名</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">注册日期</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">到期日期</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {domains.map((domain) => (
                        <tr key={domain.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <Globe className="h-5 w-5 text-gray-400 mr-2" />
                              <div className="text-sm font-medium text-gray-900">{domain.name}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{formatDate(domain.registrationDate)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{formatDate(domain.expirationDate)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(domain.status)}`}>
                              {getStatusText(domain.status)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              <Button variant="outline" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="outline" size="sm" className="text-red-600 hover:text-red-900" onClick={() => handleDeleteDomain(domain.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-16 px-4 text-center">
                  <Globe className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">没有域名</h3>
                  <p className="mt-1 text-sm text-gray-500">开始添加您的域名以进行管理。</p>
                  <div className="mt-6">
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      添加域名
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="account">
            <Card>
              <CardHeader>
                <CardTitle>账户信息</CardTitle>
                <CardDescription>管理您的个人信息和账户设置</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium mb-1">用户名</h4>
                    <p className="text-sm text-gray-500">{user?.username}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-1">邮箱地址</h4>
                    <p className="text-sm text-gray-500">{user?.email}</p>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline">更新个人信息</Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Dashboard;
