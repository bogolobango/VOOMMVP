import { Layout } from "@/components/layout";
import { useGetMessages } from "@workspace/api-client-react";
import { format } from "date-fns";
import { Link } from "wouter";
import { MessageCircle } from "lucide-react";
import { motion } from "framer-motion";

export default function Messages() {
  const { data: threads, isLoading } = useGetMessages();

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 py-8 w-full">
        <h1 className="text-3xl font-display font-bold mb-8">Messages</h1>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="p-4 bg-card rounded-2xl border border-border/50 flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-secondary animate-pulse shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-secondary rounded-lg w-1/3 animate-pulse" />
                  <div className="h-3 bg-secondary rounded-lg w-2/3 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : threads?.length === 0 ? (
          <div className="text-center py-24 bg-card rounded-3xl border border-border border-dashed">
            <MessageCircle className="w-16 h-16 mx-auto text-muted-foreground opacity-30 mb-4" />
            <h3 className="text-xl font-bold mb-2">No conversations yet</h3>
            <p className="text-muted-foreground mb-6">Browse cars to connect with hosts</p>
            <Link href="/">
              <button className="text-primary font-semibold hover:underline">Browse cars</button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {threads?.map((thread, i) => (
              <motion.div
                key={thread.userId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link href={`/messages/${thread.userId}`}>
                  <div className="p-4 bg-card hover:bg-secondary/50 rounded-2xl border border-border/50 transition-colors flex items-center gap-4 cursor-pointer">
                    <img 
                      src={thread.profilePicture || `${import.meta.env.BASE_URL}images/avatar-placeholder.png`} 
                      alt={thread.username}
                      className="w-14 h-14 rounded-full border-2 border-background shadow-sm object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-1">
                        <h3 className="font-bold text-base truncate pr-4">{thread.fullName || thread.username}</h3>
                        {thread.lastMessageAt && (
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {format(new Date(thread.lastMessageAt), "MMM d")}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{thread.lastMessage}</p>
                    </div>
                    {thread.unreadCount > 0 && (
                      <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">
                        {thread.unreadCount}
                      </div>
                    )}
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
