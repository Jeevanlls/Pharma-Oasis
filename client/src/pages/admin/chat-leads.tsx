import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ChatLead, ChatSession, ChatMessage } from "@shared/schema";
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
  Bot,
  Loader2,
  Send,
  Radio,
  UserCog,
} from "lucide-react";

export default function AdminChatLeadsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);
  const [sessionMessages, setSessionMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [liveSession, setLiveSession] = useState<ChatSession | null>(null);
  const [liveMessages, setLiveMessages] = useState<any[]>([]);
  const [liveInput, setLiveInput] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const liveMessagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  const { data: userData } = useQuery<{ user: { id: number } }>({
    queryKey: ["/api/auth/me"],
  });

  useEffect(() => {
    liveMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [liveMessages]);

  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const joinLiveChat = (session: ChatSession) => {
    if (wsRef.current) {
      wsRef.current.close();
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws/chat`);
    
    ws.onopen = () => {
      setIsConnected(true);
      ws.send(JSON.stringify({
        type: "join_session",
        sessionId: session.sessionId,
        adminId: userData?.user?.id,
      }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "history") {
        setLiveMessages(data.messages || []);
      } else if (data.type === "new_message") {
        setLiveMessages(prev => [...prev, data.message]);
      } else if (data.type === "admin_joined" || data.type === "admin_left") {
        toast({ 
          title: data.type === "admin_joined" ? "Admin joined" : "Admin left",
          description: `Admin ID: ${data.adminId}` 
        });
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
    };

    ws.onerror = () => {
      toast({ title: "Connection error", variant: "destructive" });
    };

    wsRef.current = ws;
    setLiveSession(session);
    setLiveMessages([]);
  };

  const sendLiveMessage = () => {
    if (!liveInput.trim() || !wsRef.current || !liveSession) return;
    
    wsRef.current.send(JSON.stringify({
      type: "admin_message",
      sessionId: liveSession.sessionId,
      adminId: userData?.user?.id,
      content: liveInput.trim(),
    }));
    
    setLiveInput("");
  };

  const leaveLiveChat = () => {
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({
        type: "leave_session",
        sessionId: liveSession?.sessionId,
        adminId: userData?.user?.id,
      }));
      wsRef.current.close();
    }
    setLiveSession(null);
    setLiveMessages([]);
    setIsConnected(false);
  };

  const { data: leads, isLoading: leadsLoading } = useQuery<ChatLead[]>({
    queryKey: ["/api/admin/chat/leads"],
    refetchInterval: 15000,
  });

  const { data: sessions, isLoading: sessionsLoading } = useQuery<ChatSession[]>({
    queryKey: ["/api/admin/chat/sessions"],
    refetchInterval: 15000,
  });

  const updateLeadMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      return apiRequest("PATCH", `/api/admin/chat/leads/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/chat/leads"] });
      toast({ title: "Lead status updated" });
    },
    onError: () => {
      toast({ title: "Failed to update lead", variant: "destructive" });
    },
  });

  const viewSessionMessages = async (session: ChatSession) => {
    setSelectedSession(session);
    setLoadingMessages(true);
    try {
      const response = await fetch(`/api/admin/chat/messages/${session.sessionId}`, {
        credentials: "include",
      });
      const data = await response.json();
      setSessionMessages(data);
    } catch (error) {
      toast({ title: "Failed to load messages", variant: "destructive" });
    } finally {
      setLoadingMessages(false);
    }
  };

  const filteredLeads = leads?.filter(lead =>
    (lead.name?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
    (lead.email?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
    (lead.company?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
    (lead.phone?.toLowerCase() || "").includes(searchQuery.toLowerCase())
  );

  const filteredSessions = sessions?.filter(session =>
    (session.visitorName?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
    (session.visitorEmail?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
    session.sessionId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "new":
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">New</Badge>;
      case "contacted":
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Contacted</Badge>;
      case "qualified":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Qualified</Badge>;
      case "converted":
        return <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">Converted</Badge>;
      case "closed":
        return <Badge variant="secondary">Closed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold" style={{ fontFamily: "DM Sans, sans-serif" }}>
          Chat Leads
        </h1>
        <p className="mt-2 text-muted-foreground">
          Manage leads captured from the AI chatbot and view conversation history
        </p>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search leads or sessions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-leads"
          />
        </div>
      </div>

      <Tabs defaultValue="leads" className="w-full">
        <TabsList>
          <TabsTrigger value="leads" data-testid="tab-leads">
            Leads ({leads?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="sessions" data-testid="tab-sessions">
            Chat Sessions ({sessions?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="leads" className="mt-6">
          {leadsLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <Skeleton className="h-16 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredLeads && filteredLeads.length > 0 ? (
            <div className="space-y-4">
              {filteredLeads.map((lead) => (
                <Card key={lead.id} data-testid={`card-lead-${lead.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="space-y-2 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {lead.name && (
                            <span className="font-medium flex items-center gap-1">
                              <User className="h-4 w-4" />
                              {lead.name}
                            </span>
                          )}
                          {lead.company && (
                            <span className="text-muted-foreground flex items-center gap-1">
                              <Building2 className="h-4 w-4" />
                              {lead.company}
                            </span>
                          )}
                          {getStatusBadge(lead.status)}
                        </div>

                        <div className="flex items-center gap-4 flex-wrap text-sm text-muted-foreground">
                          {lead.email && (
                            <a
                              href={`mailto:${lead.email}`}
                              className="flex items-center gap-1 hover:text-foreground"
                            >
                              <Mail className="h-4 w-4" />
                              {lead.email}
                            </a>
                          )}
                          {lead.phone && (
                            <a
                              href={`tel:${lead.phone}`}
                              className="flex items-center gap-1 hover:text-foreground"
                            >
                              <Phone className="h-4 w-4" />
                              {lead.phone}
                            </a>
                          )}
                          {lead.createdAt && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {format(new Date(lead.createdAt), "MMM d, yyyy h:mm a")}
                            </span>
                          )}
                        </div>

                        {lead.interest && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            Interest: {lead.interest}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <Select
                          value={lead.status}
                          onValueChange={(value) =>
                            updateLeadMutation.mutate({ id: lead.id, status: value })
                          }
                        >
                          <SelectTrigger className="w-32" data-testid={`select-status-${lead.id}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="new">New</SelectItem>
                            <SelectItem value="contacted">Contacted</SelectItem>
                            <SelectItem value="qualified">Qualified</SelectItem>
                            <SelectItem value="converted">Converted</SelectItem>
                            <SelectItem value="closed">Closed</SelectItem>
                          </SelectContent>
                        </Select>

                        {lead.sessionId && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const session = sessions?.find(s => s.sessionId === lead.sessionId);
                              if (session) viewSessionMessages(session);
                            }}
                            data-testid={`button-view-chat-${lead.id}`}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View Chat
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium">No leads yet</h3>
                <p className="text-muted-foreground mt-1">
                  Leads captured from the AI chatbot will appear here
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="sessions" className="mt-6">
          {sessionsLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <Skeleton className="h-16 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredSessions && filteredSessions.length > 0 ? (
            <div className="space-y-4">
              {filteredSessions.map((session) => (
                <Card key={session.id} data-testid={`card-session-${session.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="space-y-2 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-sm">
                            {session.sessionId.substring(0, 20)}...
                          </span>
                          {session.leadCaptured && (
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                              Lead Captured
                            </Badge>
                          )}
                          <Badge variant="outline">
                            {session.messageCount || 0} messages
                          </Badge>
                        </div>

                        <div className="flex items-center gap-4 flex-wrap text-sm text-muted-foreground">
                          {session.visitorName && (
                            <span className="flex items-center gap-1">
                              <User className="h-4 w-4" />
                              {session.visitorName}
                            </span>
                          )}
                          {session.visitorEmail && (
                            <span className="flex items-center gap-1">
                              <Mail className="h-4 w-4" />
                              {session.visitorEmail}
                            </span>
                          )}
                          {session.createdAt && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {format(new Date(session.createdAt), "MMM d, yyyy h:mm a")}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => viewSessionMessages(session)}
                          data-testid={`button-view-session-${session.id}`}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => joinLiveChat(session)}
                          data-testid={`button-join-chat-${session.id}`}
                        >
                          <Radio className="h-4 w-4 mr-1" />
                          Join Live
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Bot className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium">No chat sessions yet</h3>
                <p className="text-muted-foreground mt-1">
                  Chat sessions will appear here when visitors use the chatbot
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedSession} onOpenChange={() => setSelectedSession(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Chat Conversation
            </DialogTitle>
            <DialogDescription>
              Session: {selectedSession?.sessionId.substring(0, 30)}...
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 min-h-0 max-h-[400px] pr-4">
            {loadingMessages ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : sessionMessages.length > 0 ? (
              <div className="space-y-4 py-4">
                {sessionMessages.map((message, index) => (
                  <div
                    key={message.id || index}
                    className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {message.role === "assistant" && (
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Bot className="h-5 w-5 text-primary" />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] rounded-lg p-3 text-sm ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      {message.content}
                      {message.createdAt && (
                        <div className="text-xs opacity-70 mt-1">
                          {format(new Date(message.createdAt), "h:mm a")}
                        </div>
                      )}
                    </div>
                    {message.role === "user" && (
                      <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                        <User className="h-5 w-5" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No messages in this session
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Dialog open={!!liveSession} onOpenChange={() => leaveLiveChat()}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Radio className="h-5 w-5 text-green-500 animate-pulse" />
              Live Chat
              {isConnected && (
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 ml-2">
                  Connected
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              {liveSession?.visitorName ? (
                <span>Chatting with {liveSession.visitorName}</span>
              ) : (
                <span>Session: {liveSession?.sessionId.substring(0, 30)}...</span>
              )}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 min-h-0 max-h-[350px] pr-4">
            <div className="space-y-3 py-4">
              {liveMessages.map((message, index) => (
                <div
                  key={message.id || index}
                  className={`flex gap-2 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {(message.role === "assistant" || message.role === "admin") && (
                    <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${
                      message.role === "admin" ? "bg-blue-100 dark:bg-blue-900" : "bg-primary/10"
                    }`}>
                      {message.role === "admin" ? (
                        <UserCog className="h-4 w-4 text-blue-600 dark:text-blue-300" />
                      ) : (
                        <Bot className="h-4 w-4 text-primary" />
                      )}
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-lg p-3 text-sm ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : message.role === "admin"
                        ? "bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100"
                        : "bg-muted"
                    }`}
                  >
                    {message.role === "admin" && (
                      <div className="text-xs font-medium mb-1 opacity-70">You</div>
                    )}
                    {message.content}
                  </div>
                  {message.role === "user" && (
                    <div className="h-7 w-7 rounded-full bg-secondary flex items-center justify-center shrink-0">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                </div>
              ))}
              <div ref={liveMessagesEndRef} />
            </div>
          </ScrollArea>

          <div className="border-t pt-3 flex gap-2">
            <Input
              value={liveInput}
              onChange={(e) => setLiveInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendLiveMessage();
                }
              }}
              placeholder="Type your message..."
              disabled={!isConnected}
              className="flex-1"
              data-testid="input-live-message"
            />
            <Button
              size="icon"
              onClick={sendLiveMessage}
              disabled={!liveInput.trim() || !isConnected}
              data-testid="button-send-live-message"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
