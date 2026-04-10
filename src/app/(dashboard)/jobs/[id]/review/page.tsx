"use client";

// Redirect legacy /jobs/[id]/review → /listings/[id]

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Props {
  params: Promise<{ id: string }>;
}

export default function LegacyReviewRedirect({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();

  useEffect(() => {
    router.replace(`/listings/${id}`);
  }, [id, router]);

  return null;
}
