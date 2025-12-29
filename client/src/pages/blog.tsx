import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { PublicLayout } from "@/components/layout/public-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import type { BlogPost } from "@shared/schema";
import { FileText, Calendar, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import { Helmet } from "react-helmet";

interface BlogResponse {
  posts: BlogPost[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export default function BlogPage() {
  const [page, setPage] = useState(1);
  const limit = 12;
  
  const { data, isLoading } = useQuery<BlogResponse>({
    queryKey: ["/api/blog", page],
    queryFn: async () => {
      const res = await fetch(`/api/blog?page=${page}&limit=${limit}`);
      if (!res.ok) throw new Error("Failed to fetch blog posts");
      return res.json();
    },
  });

  const posts = data?.posts || [];
  const pagination = data?.pagination;

  return (
    <PublicLayout>
      <Helmet>
        <title>Blog | Pharma Oasis - Industry Insights & News</title>
        <meta name="description" content="Stay informed with the latest pharmaceutical industry insights, regulatory updates, and business tips from Pharma Oasis." />
        <meta property="og:title" content="Blog | Pharma Oasis" />
        <meta property="og:description" content="Stay informed with the latest pharmaceutical industry insights, regulatory updates, and business tips." />
        <meta property="og:type" content="website" />
      </Helmet>
      
      <div className="py-8 sm:py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold sm:text-4xl" style={{ fontFamily: "DM Sans, sans-serif" }}>
              Blog & Insights
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Stay informed with the latest pharmaceutical industry insights, 
              regulatory updates, and business tips.
            </p>
          </div>

          {isLoading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-48 w-full rounded-md mb-4" />
                    <Skeleton className="h-6 w-3/4" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-2/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : posts.length > 0 ? (
            <>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {posts.map((post) => (
                  <BlogCard key={post.id} post={post} />
                ))}
              </div>

              {pagination && pagination.totalPages > 1 && (
                <div className="mt-8 flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage(p => p - 1)}
                    data-testid="button-blog-prev"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <span className="px-4 text-sm text-muted-foreground">
                    Page {page} of {pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= pagination.totalPages}
                    onClick={() => setPage(p => p + 1)}
                    data-testid="button-blog-next"
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FileText className="mb-4 h-16 w-16 text-muted-foreground/50" />
              <h2 className="text-xl font-semibold">No blog posts yet</h2>
              <p className="mt-2 text-muted-foreground">
                Check back soon for industry insights and updates
              </p>
            </div>
          )}
        </div>
      </div>
    </PublicLayout>
  );
}

function BlogCard({ post }: { post: BlogPost }) {
  const publishedDate = post.publishedAt ? new Date(post.publishedAt) : new Date(post.createdAt);
  
  return (
    <Link href={`/blog/${post.slug}`}>
      <Card className="h-full hover-elevate cursor-pointer transition-all" data-testid={`card-blog-${post.id}`}>
        {post.featuredImage && (
          <div className="aspect-video overflow-hidden rounded-t-md">
            <img 
              src={post.featuredImage} 
              alt={post.title}
              className="h-full w-full object-cover"
            />
          </div>
        )}
        <CardHeader className={post.featuredImage ? "pt-4" : ""}>
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              {format(publishedDate, "MMM d, yyyy")}
            </span>
          </div>
          <CardTitle className="line-clamp-2 text-lg" style={{ fontFamily: "DM Sans, sans-serif" }}>
            {post.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {post.excerpt && (
            <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
              {post.excerpt}
            </p>
          )}
          <div className="flex items-center text-sm font-medium text-primary">
            Read more
            <ArrowRight className="ml-1 h-4 w-4" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
