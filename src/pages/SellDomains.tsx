
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, Globe, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const SellDomains = () => {
  const [domainName, setDomainName] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const { user } = useAuth();
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!domainName || !price) {
      toast({
        title: "错误",
        description: "请填写所有必填字段",
        variant: "destructive"
      });
      return;
    }
    
    // In a real app, this would send data to a backend
    toast({
      title: "成功",
      description: "您的域名已添加到销售列表中",
    });
    
    // Reset form
    setDomainName("");
    setPrice("");
    setDescription("");
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">出售您的域名</h1>
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium">欢迎，{user?.username}</span>
            <Link to="/dashboard">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                返回控制台
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Globe className="h-6 w-6 mr-2 text-primary" />
              发布域名出售
            </CardTitle>
            <CardDescription>
              填写下面的表单，将您的域名添加到我们的市场中进行销售
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="domain-name" className="text-sm font-medium">
                  域名 <span className="text-red-500">*</span>
                </label>
                <Input
                  id="domain-name"
                  placeholder="例如：example.com"
                  value={domainName}
                  onChange={(e) => setDomainName(e.target.value)}
                  required
                />
                <p className="text-xs text-gray-500">
                  输入您想要出售的域名，不包含 http:// 或 www
                </p>
              </div>
              
              <div className="space-y-2">
                <label htmlFor="price" className="text-sm font-medium">
                  价格 (元) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <Input
                    id="price"
                    type="number"
                    placeholder="设置您的售价"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="pl-10"
                    required
                    min="0"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label htmlFor="description" className="text-sm font-medium">
                  描述 (可选)
                </label>
                <textarea
                  id="description"
                  placeholder="描述您的域名，添加关键词以提高可见性"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="flex h-32 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              
              <Button type="submit" className="w-full">
                发布销售信息
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex justify-center border-t pt-6">
            <p className="text-xs text-gray-500">
              通过发布，您同意我们的服务条款和域名销售政策
            </p>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
};

export default SellDomains;
