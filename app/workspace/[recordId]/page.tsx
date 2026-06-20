import { ClinicalWorkspace } from "@/components/workspace/clinical-workspace"

type WorkspacePageProps = {
  params: Promise<{ recordId: string }>
}

export default async function WorkspacePage({ params }: WorkspacePageProps) {
  const { recordId } = await params
  return <ClinicalWorkspace recordId={recordId} />
}
