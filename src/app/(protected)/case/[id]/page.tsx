import { notFound } from "next/navigation";
import { getCase } from "@/actions/cases";
import { CaseDetail } from "@/components/case-detail";

export default async function CaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const caseData = await getCase(id);

  if (!caseData) {
    notFound();
  }

  return <CaseDetail caseData={caseData} />;
}
