/** @format */

import { ExternalLink, Download } from "lucide-react";

type FileActionsProps = {
  submissionId: string;
  hasFile?: boolean;
  className?: string;
};

export default function FileActions({
  submissionId,
  hasFile = true,
  className = "",
}: FileActionsProps) {
  if (!hasFile) return null;

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      <a
        href={`/api/files/${submissionId}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white transition hover:bg-slate-800"
      >
        Preview
        <ExternalLink size={16} />
      </a>

      <a
        href={`/api/files/${submissionId}?download=1`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
      >
        Download
        <Download size={16} />
      </a>
    </div>
  );
}
