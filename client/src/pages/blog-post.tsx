import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { PublicLayout } from "@/components/layout/public-layout";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import type { BlogPost } from "@shared/schema";
import { Calendar, ArrowLeft, User } from "lucide-react";
import { format } from "date-fns";
import { Helmet } from "react-helmet";

export default function BlogPostPage() {
  const [, params] = useRoute("/blog/:slug");
  const slug = params?.slug;
  
  const { data: post, isLoading, error } = useQuery<BlogPost>({
    queryKey: ["/api/blog", slug],
    queryFn: async () => {
      const res = await fetch(`/api/blog/${slug}`);
      if (!res.ok) {
        if (res.status === 404) throw new Error("Post not found");
        throw new Error("Failed to fetch blog post");
      }
      return res.json();
    },
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <PublicLayout>
        <div className="py-8 sm:py-12">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <Skeleton className="h-8 w-24 mb-8" />
            <Skeleton className="h-12 w-3/4 mb-4" />
            <Skeleton className="h-6 w-48 mb-8" />
            <Skeleton className="h-64 w-full mb-8" />
            <div className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
        </div>
      </PublicLayout>
    );
  }

  if (error || !post) {
    return (
      <PublicLayout>
        <div className="py-16">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-2xl font-bold mb-4">Blog Post Not Found</h1>
            <p className="text-muted-foreground mb-8">
              The article you're looking for doesn't exist or has been removed.
            </p>
            <Link href="/blog">
              <Button>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Blog
              </Button>
            </Link>
          </div>
        </div>
      </PublicLayout>
    );
  }

  const publishedDate = post.publishedAt ? new Date(post.publishedAt) : new Date(post.createdAt);

  return (
    <PublicLayout>
      <Helmet>
        <title>{post.metaTitle || post.title} | Pharma Oasis Blog</title>
        <meta name="description" content={post.metaDescription || post.excerpt || `Read ${post.title} on Pharma Oasis Blog`} />
        <meta property="og:title" content={post.metaTitle || post.title} />
        <meta property="og:description" content={post.metaDescription || post.excerpt || ""} />
        <meta property="og:type" content="article" />
        {post.featuredImage && <meta property="og:image" content={post.featuredImage} />}
        <meta property="article:published_time" content={publishedDate.toISOString()} />
        <link rel="canonical" href={`https://pharmaoasis.co.uk/blog/${post.slug}`} />
      </Helmet>
      
      <article className="py-8 sm:py-12">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <Link href="/blog">
            <Button variant="ghost" size="sm" className="mb-8" data-testid="button-back-to-blog">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Blog
            </Button>
          </Link>

          <header className="mb-8">
            <h1 className="text-3xl font-bold sm:text-4xl lg:text-5xl mb-4" style={{ fontFamily: "DM Sans, sans-serif" }}>
              {post.title}
            </h1>
            
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                <time dateTime={publishedDate.toISOString()}>
                  {format(publishedDate, "MMMM d, yyyy")}
                </time>
              </div>
            </div>
          </header>

          {post.featuredImage && (
            <div className="mb-8 overflow-hidden rounded-lg">
              <img 
                src={post.featuredImage} 
                alt={post.title}
                className="w-full h-auto object-cover"
              />
            </div>
          )}

          <div 
            className="prose prose-lg dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: formatContent(post.content) }}
          />

          <footer className="mt-12 pt-8 border-t">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <p className="text-muted-foreground">
                Thank you for reading. For more industry insights, browse our blog.
              </p>
              <Link href="/blog">
                <Button variant="outline" data-testid="button-more-articles">
                  More Articles
                </Button>
              </Link>
            </div>
          </footer>
        </div>
      </article>
    </PublicLayout>
  );
}

function formatContent(content: string): string {
  let formatted = content;
  
  if (!content.startsWith('<') && !content.includes('<p>')) {
    const paragraphs = content.split(/\n\n+/);
    formatted = paragraphs
      .map(p => {
        if (p.startsWith('# ')) {
          return `<h1>${p.slice(2)}</h1>`;
        }
        if (p.startsWith('## ')) {
          return `<h2>${p.slice(3)}</h2>`;
        }
        if (p.startsWith('### ')) {
          return `<h3>${p.slice(4)}</h3>`;
        }
        if (p.startsWith('- ') || p.startsWith('* ')) {
          const items = p.split('\n').map(line => `<li>${line.slice(2)}</li>`).join('');
          return `<ul>${items}</ul>`;
        }
        return `<p>${p.replace(/\n/g, '<br/>')}</p>`;
      })
      .join('\n');
  }
  
  formatted = processExternalLinks(formatted);
  
  return formatted;
}

function processExternalLinks(html: string): string {
  const externalDomains = [
    'gov.uk',
    'mhra.gov.uk',
    'ema.europa.eu',
    'who.int',
    'nice.org.uk',
    'nhs.uk',
  ];
  
  return html.replace(/<a\s+([^>]*href\s*=\s*["'])(https?:\/\/[^"']+)(["'][^>]*)>/gi, (match, prefix, url, suffix) => {
    const isExternal = externalDomains.some(domain => url.includes(domain)) || 
                       (url.startsWith('http') && !url.includes('pharmaoasis.co.uk'));
    
    if (isExternal) {
      const hasTarget = /target\s*=/i.test(match);
      const hasRel = /rel\s*=/i.test(match);
      
      let newTag = `<a ${prefix}${url}${suffix}`;
      
      if (!hasTarget) {
        newTag = newTag.replace(/>$/, ' target="_blank">');
      }
      if (!hasRel) {
        newTag = newTag.replace(/>$/, ' rel="noopener noreferrer">');
      }
      
      return newTag;
    }
    
    return match;
  });
}
