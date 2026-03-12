import { useState, useRef, useEffect } from "react";
import { Layout } from "@/components/layout";
import { useRoute } from "wouter";
import { useGetConversation, useSendMessage, useGetMe } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Input, Button } from "@/components/ui-elements";
import { ChevronLeft, Send } from "lucide-react";
import { format } from "date-fns";

export default function MessageDetail() {
  const [, params] = useRoute("/messages/:id");
  const userId = parseInt(params?.id || "0");
  
  const { data: me } = useGetMe();
  const { data: messages, isLoading } = useGetConversation(userId);
  const queryClient = useQueryClient();
  
  const [content, setContent] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const sendMessage = useSendMessage({
    mutation: {
      onSuccess: () => {
        setContent("");
        queryClient.invalidateQueries({ queryKey: [`/api/messages/${userId}`] });
      }
    }
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    sendMessage.mutate({ data: { receiverId: userId, content } });
  };

  return (
    <Layout>
      <div className="flex flex-col h-[calc(100vh-64px)] md:h-screen">
        {/* Header */}
        <div className="bg-card border-b border-border/50 p-4 flex items-center gap-4 sticky top-0 z-10 shadow-sm">
          <button onClick={() => window.history.back()} className="p-2 bg-secondary rounded-full hover:bg-secondary/80">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <img src={`${import.meta.env.BASE_URL}images/avatar-placeholder.png`} className="w-10 h-10 rounded-full" alt="Avatar" />
            <h2 className="font-bold text-lg">User #{userId}</h2>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background">
          {isLoading ? (
            <div className="flex justify-center p-8"><div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
          ) : (
            messages?.map(msg => {
              const isMe = msg.senderId === me?.id;
              return (
                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${isMe ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-card border border-border/50 text-foreground rounded-tl-sm shadow-sm'}`}>
                    <p className="text-[15px] leading-relaxed">{msg.content}</p>
                    <p className={`text-[10px] mt-1 ${isMe ? 'text-primary-foreground/70 text-right' : 'text-muted-foreground'}`}>
                      {msg.createdAt && format(new Date(msg.createdAt), "h:mm a")}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="bg-card border-t border-border/50 p-4 pb-safe">
          <form onSubmit={handleSend} className="flex gap-2 max-w-4xl mx-auto">
            <Input 
              placeholder="Type a message..." 
              value={content}
              onChange={e => setContent(e.target.value)}
              className="rounded-full bg-secondary border-transparent focus-visible:border-primary"
            />
            <Button type="submit" size="icon" className="rounded-full shrink-0" disabled={!content.trim() || sendMessage.isPending}>
              <Send className="w-5 h-5" />
            </Button>
          </form>
        </div>
      </div>
    </Layout>
  );
}
