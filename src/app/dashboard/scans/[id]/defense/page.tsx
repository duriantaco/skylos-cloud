import DefenseScanReceiptPage from "@/components/DefenseScanReceiptPage";

export default async function DefenseScanReceiptRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <DefenseScanReceiptPage scanId={id} />;
}
