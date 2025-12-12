import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { MessageSquare, X, Send, Loader2, User, Bot, Minimize2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface LeadFormData {
  name: string;
  email: string;
  phone: string;
  company: string;
}

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showIntroForm, setShowIntroForm] = useState(true);
  const [leadFormData, setLeadFormData] = useState<LeadFormData>({
    name: "",
    email: "",
    phone: "",
    company: "",
  });
  const [leadSubmitted, setLeadSubmitted] = useState(false);
  const [adminActive, setAdminActive] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const connectWebSocket = (sid: string) => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws/chat`);
    
    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "join_session", sessionId: sid }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "new_message" && data.message) {
        if (data.message.role === "admin" || data.message.role === "assistant") {
          setMessages(prev => [...prev, { 
            role: data.message.role === "admin" ? "assistant" : data.message.role, 
            content: data.message.content 
          }]);
          setIsLoading(false);
        }
      } else if (data.type === "admin_joined") {
        setAdminActive(true);
      } else if (data.type === "admin_left") {
        setAdminActive(false);
      }
    };

    ws.onerror = () => {
      console.log("WebSocket error, falling back to REST");
    };

    wsRef.current = ws;
  };

  const startSessionWithLead = async () => {
    if (!leadFormData.name.trim() || !leadFormData.email.trim()) return;
    
    try {
      const response = await apiRequest("POST", "/api/chat/session", {
        visitorName: leadFormData.name,
        visitorEmail: leadFormData.email,
        visitorCompany: leadFormData.company,
      });
      const data = await response.json();
      setSessionId(data.sessionId);
      setShowIntroForm(false);
      setLeadSubmitted(true);
      setMessages([
        {
          role: "assistant",
          content: `Hi ${leadFormData.name.split(' ')[0]}! How can I help you today?`,
        },
      ]);
      connectWebSocket(data.sessionId);
    } catch (error) {
      console.error("Failed to start chat session:", error);
    }
  };

  const handleOpen = () => {
    setIsOpen(true);
    setIsMinimized(false);
  };

  const handleClose = () => {
    setIsOpen(false);
    setIsMinimized(false);
  };

  const handleMinimize = () => {
    setIsMinimized(true);
  };

  const sendMessage = async () => {
    if (!input.trim() || !sessionId || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await apiRequest("POST", "/api/chat/message", {
        sessionId,
        message: userMessage,
      });
      const data = await response.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.response },
      ]);

    } catch (error) {
      console.error("Failed to send message:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "I apologize, I'm having trouble right now. Please contact us at trade@pharmaoasis.com.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };


  if (!isOpen) {
    return (
      <Button
        onClick={handleOpen}
        size="lg"
        className="fixed bottom-6 right-6 z-50 rounded-full shadow-lg h-14 w-14 p-0"
        data-testid="button-open-chat"
      >
        <MessageSquare className="h-6 w-6" />
      </Button>
    );
  }

  if (isMinimized) {
    return (
      <div
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-6 right-6 z-50 cursor-pointer"
        data-testid="chat-minimized"
      >
        <Card className="w-64 shadow-lg">
          <CardHeader className="p-3 flex flex-row items-center justify-between gap-2 bg-primary text-primary-foreground rounded-t-md">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              <span className="font-medium text-sm">Chat with us</span>
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                handleClose();
              }}
              className="h-6 w-6 text-primary-foreground"
              data-testid="button-close-chat-minimized"
            >
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <Card
      className="fixed bottom-6 right-6 z-50 w-96 max-w-[calc(100vw-3rem)] shadow-xl flex flex-col"
      style={{ height: "500px", maxHeight: "calc(100vh - 6rem)" }}
      data-testid="chat-widget"
    >
      <CardHeader className="p-3 flex flex-row items-center justify-between gap-2 bg-primary text-primary-foreground rounded-t-md shrink-0">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          <span className="font-medium">Pharma Oasis Assistant</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            onClick={handleMinimize}
            className="h-6 w-6 text-primary-foreground"
            data-testid="button-minimize-chat"
          >
            <Minimize2 className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={handleClose}
            className="h-6 w-6 text-primary-foreground"
            data-testid="button-close-chat"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
        {showIntroForm ? (
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <div className="bg-muted rounded-lg p-3 text-sm">
                Hi! I'm here to help. Quick intro first?
              </div>
            </div>
            <div className="space-y-2 pt-2">
              <Input
                placeholder="Your name *"
                value={leadFormData.name}
                onChange={(e) =>
                  setLeadFormData({ ...leadFormData, name: e.target.value })
                }
                className="h-9 text-sm"
                data-testid="input-intro-name"
              />
              <Input
                placeholder="Email address *"
                type="email"
                value={leadFormData.email}
                onChange={(e) =>
                  setLeadFormData({ ...leadFormData, email: e.target.value })
                }
                className="h-9 text-sm"
                data-testid="input-intro-email"
              />
              <Input
                placeholder="Company (optional)"
                value={leadFormData.company}
                onChange={(e) =>
                  setLeadFormData({ ...leadFormData, company: e.target.value })
                }
                className="h-9 text-sm"
                data-testid="input-intro-company"
              />
              <Button
                className="w-full"
                onClick={startSessionWithLead}
                disabled={!leadFormData.name.trim() || !leadFormData.email.trim()}
                data-testid="button-start-chat"
              >
                Start Chat
              </Button>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex gap-2 ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {message.role === "assistant" && (
                  <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-lg p-3 text-sm ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                  data-testid={`chat-message-${message.role}-${index}`}
                >
                  {message.content}
                </div>
                {message.role === "user" && (
                  <div className="h-7 w-7 rounded-full bg-secondary flex items-center justify-center shrink-0">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-2 justify-start">
                <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
          </>
        )}

        <div ref={messagesEndRef} />
      </CardContent>

      {!showIntroForm && (
        <CardFooter className="p-3 border-t shrink-0">
          <div className="flex gap-2 w-full">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              disabled={isLoading}
              className="flex-1"
              data-testid="input-chat-message"
            />
            <Button
              size="icon"
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              data-testid="button-send-message"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}
