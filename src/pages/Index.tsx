
import { WhoisSearchForm } from "@/components/whois/WhoisSearchForm";
import { WhoisServerAlert } from "@/components/whois/WhoisServerAlert";
import { WhoisErrorAlert } from "@/components/whois/WhoisErrorAlert";
import { WhoisResults } from "@/components/whois/WhoisResults";
import { useWhoisLookup } from "@/hooks/use-whois-lookup";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LogIn, LogOut, Globe } from "lucide-react";

const Index = () => {
  const {
    whoisData,
    loading,
    error,
    specificServer,
    lastDomain,
    handleWhoisLookup,
    retryLookup
  } = useWhoisLookup();

  const { isAuthenticated, user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-white py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <header className="mb-8 flex justify-between items-center">
          <div className="text-center flex-grow">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              域名查询工具
            </h1>
            <p className="text-md text-gray-600">
              输入要查询的域名，获取详细信息
            </p>
          </div>
          <div className="flex gap-2">
            {isAuthenticated ? (
              <>
                <Link to="/dashboard">
                  <Button variant="outline" size="sm" className="flex items-center gap-1">
                    <Globe className="h-4 w-4" />
                    用户中心
                  </Button>
                </Link>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="flex items-center gap-1"
                  onClick={logout}
                >
                  <LogOut className="h-4 w-4" />
                  退出
                </Button>
              </>
            ) : (
              <Link to="/login">
                <Button variant="outline" size="sm" className="flex items-center gap-1">
                  <LogIn className="h-4 w-4" />
                  登录
                </Button>
              </Link>
            )}
          </div>
        </header>

        <WhoisSearchForm 
          onSearch={handleWhoisLookup}
          loading={loading}
        />

        <div className="mt-4 flex justify-center">
          <Link to={isAuthenticated ? "/sell-domains" : "/login"}>
            <Button variant="secondary" className="w-full md:w-auto">
              出售您的域名
            </Button>
          </Link>
        </div>

        {specificServer && (
          <WhoisServerAlert
            server={specificServer}
            onFetchMore={(server) => handleWhoisLookup(whoisData?.domain || "", server)}
            loading={loading}
          />
        )}

        {error && (
          <WhoisErrorAlert 
            error={error} 
            domain={lastDomain || undefined}
            onRetry={retryLookup}
          />
        )}

        {whoisData && (
          <WhoisResults data={whoisData} />
        )}
      </div>
    </div>
  );
};

export default Index;
