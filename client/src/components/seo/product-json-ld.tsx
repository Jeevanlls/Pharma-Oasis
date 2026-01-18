import type { Product, Brand } from "@shared/schema";

interface ProductListJsonLdProps {
  products: Product[];
  brands?: Brand[];
}

export function ProductListJsonLd({ products, brands }: ProductListJsonLdProps) {
  const getBrandName = (brandId: number | null) => {
    if (!brandId || !brands) return undefined;
    return brands.find(b => b.id === brandId)?.name;
  };

  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "Pharma Oasis Product Catalogue",
    "description": "Wholesale pharmaceutical and healthcare products for UK pharmacies and retailers",
    "numberOfItems": products.length,
    "itemListElement": products.slice(0, 100).map((product, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "item": {
        "@type": "Product",
        "name": product.productName,
        "sku": product.sku,
        "gtin13": product.ean || undefined,
        "description": product.shortDescription || product.longDescription || `${product.productName} - wholesale pharmaceutical product`,
        "image": product.imageUrl || undefined,
        "brand": getBrandName(product.brandId) ? {
          "@type": "Brand",
          "name": getBrandName(product.brandId)
        } : undefined,
        "offers": product.wholesalePrice ? {
          "@type": "Offer",
          "availability": product.isActive 
            ? "https://schema.org/InStock" 
            : "https://schema.org/OutOfStock",
          "priceCurrency": "GBP",
          "price": parseFloat(product.wholesalePrice).toFixed(2),
          "priceValidUntil": new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          "seller": {
            "@type": "Organization",
            "name": "Pharma Oasis"
          }
        } : undefined
      }
    }))
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
    />
  );
}

interface SingleProductJsonLdProps {
  product: Product;
  brandName?: string;
  categoryName?: string;
}

export function SingleProductJsonLd({ product, brandName, categoryName }: SingleProductJsonLdProps) {
  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": product.productName,
    "sku": product.sku,
    "gtin13": product.ean || undefined,
    "description": product.shortDescription || product.longDescription || product.metaDescription || `${product.productName} - wholesale pharmaceutical product`,
    "image": product.imageUrl || undefined,
    "brand": brandName ? {
      "@type": "Brand",
      "name": brandName
    } : undefined,
    "category": categoryName || undefined,
    "offers": product.wholesalePrice ? {
      "@type": "Offer",
      "url": `https://pharmaoasis.co.uk/products/${product.slug || product.id}`,
      "availability": product.isActive 
        ? "https://schema.org/InStock" 
        : "https://schema.org/OutOfStock",
      "priceCurrency": "GBP",
      "price": parseFloat(product.wholesalePrice).toFixed(2),
      "priceValidUntil": new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      "seller": {
        "@type": "Organization",
        "name": "Pharma Oasis",
        "url": "https://pharmaoasis.co.uk"
      }
    } : undefined
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
    />
  );
}

export function OrganizationJsonLd() {
  const orgSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": "https://pharmaoasis.co.uk/#organization",
    "name": "Pharma Oasis",
    "legalName": "Pharma Oasis Limited",
    "url": "https://pharmaoasis.co.uk",
    "logo": "https://pharmaoasis.co.uk/logo.png",
    "description": "MHRA-licensed pharmaceutical wholesaler and healthcare distributor serving UK pharmacies, hospitals, and healthcare providers with over 20,000 products.",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "Unit - J, Doddington Park Farmhouse, Bridgemere",
      "addressLocality": "Nantwich",
      "postalCode": "CW5 7PU",
      "addressCountry": "GB"
    },
    "telephone": "+44 7481 640640",
    "email": "trade@pharmaoasis.com",
    "taxID": "364 4962 68",
    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": "sales",
      "telephone": "+44 7481 640640",
      "email": "trade@pharmaoasis.com",
      "availableLanguage": "English"
    },
    "sameAs": [
      "https://pharmaoasis.com"
    ]
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
    />
  );
}

export function WebsiteJsonLd() {
  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": "https://pharmaoasis.co.uk/#website",
    "name": "Pharma Oasis",
    "url": "https://pharmaoasis.co.uk",
    "publisher": {
      "@id": "https://pharmaoasis.co.uk/#organization"
    },
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": "https://pharmaoasis.co.uk/products?search={search_term_string}"
      },
      "query-input": "required name=search_term_string"
    }
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
    />
  );
}
