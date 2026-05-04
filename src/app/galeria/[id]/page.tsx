import { GalleryDetailContent } from "@/components/public/gallery-detail-content";
import { getPublicSiteData } from "@/lib/public-site";

export const dynamic = "force-dynamic";

export default async function GalleryDetailPage({
  params,
}: Readonly<{
  params: Promise<{ id: string }>;
}>) {
  const { id } = await params;
  const siteData = await getPublicSiteData();

  return <GalleryDetailContent galleryItemId={id} siteData={siteData} />;
}
