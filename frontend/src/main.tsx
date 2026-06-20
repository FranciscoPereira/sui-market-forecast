import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SuiClientProvider, WalletProvider, createNetworkConfig } from "@mysten/dapp-kit";
import "@mysten/dapp-kit/dist/index.css";
import "./index.css";

import { Navbar } from "./components/Navbar";
import MarketsPage     from "./pages/MarketsPage";
import MarketDetailPage from "./pages/MarketDetailPage";
import PortfolioPage   from "./pages/PortfolioPage";
import { NETWORK, RPC_URL } from "./lib/constants";

const { networkConfig } = createNetworkConfig({
  testnet: { url: RPC_URL },
});

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networkConfig} defaultNetwork={NETWORK}>
        <WalletProvider autoConnect>
          <BrowserRouter>
            <div className="min-h-screen bg-surface text-white">
              <Navbar />
              <main>
                <Routes>
                  <Route path="/"             element={<MarketsPage />}      />
                  <Route path="/market/:id"   element={<MarketDetailPage />} />
                  <Route path="/portfolio"    element={<PortfolioPage />}    />
                </Routes>
              </main>
            </div>
          </BrowserRouter>
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
