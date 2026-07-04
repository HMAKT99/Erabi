import type { Metadata } from "next";
import ServicesView from "./ServicesView";

export const metadata: Metadata = {
  title: "x402 service reliability index · ERABI",
  description:
    "Live reliability index of paid (x402) agent services: uptime, latency, and price from continuous real probes, each published as a signed, reusable attestation.",
};

export default function ServicesPage() {
  return <ServicesView />;
}
