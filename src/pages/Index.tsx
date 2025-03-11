
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
    <div className="min-h-screen bg-white py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            域名查询工具
          </h1>
          <p className="text-md text-gray-600">
            输入要查询的域名，获取详细信息
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
