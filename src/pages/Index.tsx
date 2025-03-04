
import { WhoisSearchForm } from "@/components/whois/WhoisSearchForm";
import { WhoisServerAlert } from "@/components/whois/WhoisServerAlert";
import { WhoisErrorAlert } from "@/components/whois/WhoisErrorAlert";
import { WhoisResults } from "@/components/whois/WhoisResults";
import { useWhoisLookup } from "@/hooks/use-whois-lookup";

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

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Whois 域名查询系统
          </h1>
          <p className="text-gray-600">
            直接连接WHOIS服务器查询详细注册信息
          </p>
        </div>

        <WhoisSearchForm 
          onSearch={handleWhoisLookup}
          loading={loading}
        />

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
