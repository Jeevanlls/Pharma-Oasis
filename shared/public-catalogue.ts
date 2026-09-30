/** Public catalogue never includes supplier costs, internal notes or source audits. */
export function publicProduct(p: any) {
  return { id:p.id,sku:p.sku,ean:p.ean,productName:p.productName,brandId:p.brandId,categoryId:p.categoryId,subcategoryId:p.subcategoryId,
    packSize:p.packSize,caseSize:p.caseSize,imageUrl:p.imageUrl,slug:p.slug,shortDescription:p.shortDescription,longDescription:p.longDescription,
    productType:p.productType,storageConditions:p.storageConditions,countryOfOrigin:p.countryOfOrigin,isActive:p.isActive,isFeatured:p.isFeatured,
    metaTitle:p.metaTitle,metaDescription:p.metaDescription,moq:p.moq };
}
export const isBarcodeReference = (value: string | null | undefined) => /^(?:\d{8}|\d{12,14})$/.test(value ?? "");
