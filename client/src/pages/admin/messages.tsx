import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ContactMessage } from "@shared/schema";
import { format } from "date-fns";
import { 
  Search, 
  MessageSquare, 
  Eye,
  Mail,
  User,
  Building2,
  Phone,
  Calendar,
  CheckCircle,
  Circle,
  Trash2,
  Loader2,
  Reply,
} from "lucide-react";

export default function AdminMessagesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [replyText, setReplyText] = useState("");
  const { toast } = useToast();

  const { data: messages, isLoading } = useQuery<ContactMessage[]>({
    queryKey: ["/api/admin/messages"],
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/admin/messages/${id}/read`, {
        method: "PATCH",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/messages"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/admin/messages/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/messages"] });
      toast({ title: "Message deleted" });
      setSelectedMessage(null);
    },
    onError: () => {
      toast({ title: "Failed to delete message", variant: "destructive" });
    },
  });

  const filteredMessages = messages?.filter(msg =>
    msg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    msg.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    msg.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    msg.message.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const unreadMessages = filteredMessages?.filter(m => !m.isRead) || [];
  const readMessages = filteredMessages?.filter(m => m.isRead) || [];

  const handleView = (message: ContactMessage) => {
    setSelectedMessage(message);
    if (!message.isRead) {
      markReadMutation.mutate(message.id);
    }
  };

  const handleReply = () => {
    if (!selectedMessage?.email || !replyText) return;
    window.location.href = `mailto:${selectedMessage.email}?subject=Re: ${selectedMessage.subject}&body=${encodeURIComponent(replyText)}`;
    toast({ title: "Opening email client..." });
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold" style={{ fontFamily: "DM Sans, sans-serif" }}>
          Contact Messages
        </h1>
        <p className="mt-2 text-muted-foreground">
          Manage customer enquiries and contact form submissions
        </p>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          {unreadMessages.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Badge>{unreadMessages.length}</Badge>
                Unread Messages
              </h2>
              <div className="space-y-4">
                {unreadMessages.map((message) => (
                  <MessageCard
                    key={message.id}
                    message={message}
                    onView={() => handleView(message)}
                    onDelete={() => {
                      if (confirm("Delete this message?")) {
                        deleteMutation.mutate(message.id);
                      }
                    }}
                    isDeleting={deleteMutation.isPending}
                  />
                ))}
              </div>
            </div>
          )}

          <div>
            <h2 className="text-lg font-semibold mb-4">
              {unreadMessages.length > 0 ? "Read Messages" : "All Messages"} ({readMessages.length})
            </h2>
            {readMessages.length > 0 ? (
              <div className="space-y-4">
                {readMessages.map((message) => (
                  <MessageCard
                    key={message.id}
                    message={message}
                    onView={() => handleView(message)}
                    onDelete={() => {
                      if (confirm("Delete this message?")) {
                        deleteMutation.mutate(message.id);
                      }
                    }}
                    isDeleting={deleteMutation.isPending}
                  />
                ))}
              </div>
            ) : unreadMessages.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">No messages yet</p>
                </CardContent>
              </Card>
            ) : null}
          </div>
        </div>
      )}

      <Dialog open={!!selectedMessage} onOpenChange={() => setSelectedMessage(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "DM Sans, sans-serif" }}>
              {selectedMessage?.subject}
            </DialogTitle>
            <DialogDescription>
              Contact form submission
            </DialogDescription>
          </DialogHeader>

          {selectedMessage && (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Name</p>
                    <p className="font-medium">{selectedMessage.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{selectedMessage.email}</p>
                  </div>
                </div>
                {selectedMessage.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p className="font-medium">{selectedMessage.phone}</p>
                    </div>
                  </div>
                )}
                {selectedMessage.company && (
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Company</p>
                      <p className="font-medium">{selectedMessage.company}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Received</p>
                    <p className="font-medium">
                      {format(new Date(selectedMessage.createdAt), "PPpp")}
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-2">Message</h4>
                <p className="text-sm whitespace-pre-wrap bg-muted p-4 rounded-lg">
                  {selectedMessage.message}
                </p>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-2">Quick Reply</h4>
                <Textarea
                  placeholder="Type your reply..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button 
              variant="destructive" 
              onClick={() => {
                if (selectedMessage && confirm("Delete this message?")) {
                  deleteMutation.mutate(selectedMessage.id);
                }
              }}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
            <div className="flex-1" />
            <Button variant="outline" onClick={() => setSelectedMessage(null)}>
              Close
            </Button>
            <Button onClick={handleReply} disabled={!replyText}>
              <Reply className="h-4 w-4 mr-1" />
              Reply via Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface MessageCardProps {
  message: ContactMessage;
  onView: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}

function MessageCard({ message, onView, onDelete, isDeleting }: MessageCardProps) {
  return (
    <Card 
      className={!message.isRead ? "border-primary/30 bg-primary/5" : ""}
      data-testid={`card-message-${message.id}`}
    >
      <CardContent className="p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {message.isRead ? (
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Circle className="h-4 w-4 text-primary fill-primary" />
              )}
              <h3 className="font-medium truncate">{message.subject}</h3>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {message.name}
              </span>
              <span className="flex items-center gap-1">
                <Mail className="h-3 w-3" />
                {message.email}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(new Date(message.createdAt), "MMM d, yyyy")}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-2 line-clamp-1">
              {message.message}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={onView}>
              <Eye className="h-4 w-4 mr-1" />
              View
            </Button>
            <Button 
              size="sm" 
              variant="destructive" 
              onClick={onDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
