import ProvenanceScanReceiptPage from "@/components/ProvenanceScanReceiptPage";

export default async function ProvenanceScanReceiptRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <ProvenanceScanReceiptPage scanId={id} />;
}
