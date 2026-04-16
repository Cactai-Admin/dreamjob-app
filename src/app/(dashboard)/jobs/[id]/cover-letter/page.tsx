"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Props {
  params: Promise<{ id: string }>;
}

export default function LegacyCoverLetterRedirect({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();

  useEffect(() => {
    router.replace(`/jobs/${id}`);
  }, [id, router]);

  return null;
}
