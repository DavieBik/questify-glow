import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, Avatar as AvatarComponent, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Search, Send, MessageCircle, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
}

interface Conversation {
  id: string;
  title?: string;
  type: 'direct' | 'group';
  created_by: string;
  created_at: string;
  updated_at: string;
  other_user?: User;
  participant_count?: number;
  last_message?: {
    content: string;
    created_at: string;
    sender_name: string;
  };
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: 'text' | 'file' | 'image';
  file_url?: string;
  created_at: string;
  sender?: User;
}

const Messages: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      fetchConversations();
      fetchUsers();
    }
  }, [user]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);
      markAsRead(selectedConversation.id);
    }
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchConversations = async () => {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          conversation_participants!inner(
            user_id,
            last_read_at
          )
        `)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Get participant details and last messages for each conversation
      const conversationsWithDetails = await Promise.all(
        data.map(async (conv) => {
          // Get other participants for direct messages
          if (conv.type === 'direct') {
            const { data: participants } = await supabase
              .from('conversation_participants')
              .select(`
                user_id,
                users!inner(id, first_name, last_name, email, role)
              `)
              .eq('conversation_id', conv.id)
              .neq('user_id', user?.id);

            const otherUser = participants?.[0]?.users as any;
            
            // Get last message
            const { data: lastMessage } = await supabase
              .from('messages')
              .select(`
                content,
                created_at,
                users!inner(first_name, last_name)
              `)
              .eq('conversation_id', conv.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            return {
              ...conv,
              type: conv.type as 'direct' | 'group',
              other_user: otherUser ? {
                id: otherUser.id,
                first_name: otherUser.first_name,
                last_name: otherUser.last_name,
                email: otherUser.email,
                role: otherUser.role
              } : undefined,
              last_message: lastMessage ? {
                content: lastMessage.content,
                created_at: lastMessage.created_at,
                sender_name: `${(lastMessage.users as any).first_name} ${(lastMessage.users as any).last_name}`
              } : undefined
            };
          } else {
            // For group conversations, get participant count
            const { count } = await supabase
              .from('conversation_participants')
              .select('*', { count: 'exact', head: true })
              .eq('conversation_id', conv.id);

            return {
              ...conv,
              type: conv.type as 'direct' | 'group',
              participant_count: count || 0
            };
          }
        })
      );

      setConversations(conversationsWithDetails);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      toast({
        title: "Error",
        description: "Failed to fetch conversations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .rpc('message_allowed_recipient_list');

      if (error) throw error;

      setUsers(
        (data || []).map((row: any) => ({
          id: row.id,
          first_name: row.first_name,
          last_name: row.last_name,
          email: row.email,
          role: row.role,
        })),
      );
    } catch (error) {
      console.error('Error fetching allowed recipients:', error);
      toast({
        title: 'Error',
        description: 'Unable to load your messaging contacts.',
        variant: 'destructive',
      });
    }
  };

  const fetchMessages = async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          users!inner(id, first_name, last_name, email)
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      const messagesWithSender = (data || []).map(msg => ({
        ...msg,
        message_type: msg.message_type as 'text' | 'file' | 'image',
        sender: {
          id: (msg.users as any).id,
          first_name: (msg.users as any).first_name,
          last_name: (msg.users as any).last_name,
          email: (msg.users as any).email,
          role: (msg.users as any).role || 'worker'
        }
      }));
      
      setMessages(messagesWithSender);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const markAsRead = async (conversationId: string) => {
    try {
      await supabase
        .from('conversation_participants')
        .update({ last_read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .eq('user_id', user?.id);
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const startDirectConversation = async (otherUserId: string) => {
    try {
      const { data, error } = await supabase
        .rpc('get_or_create_direct_conversation', { other_user_id: otherUserId });

      if (error) throw error;

      // Find the conversation in our list or fetch it
      let conversation = conversations.find(c => c.id === data);
      
      if (!conversation) {
        await fetchConversations();
        conversation = conversations.find(c => c.id === data);
      }

      if (conversation) {
        setSelectedConversation(conversation);
      }
    } catch (error: any) {
      console.error('Error starting conversation:', error);
      toast({
        title: "Error",
        description: error?.message?.includes('not permitted')
          ? "You're not permitted to message that user."
          : "Failed to start conversation",
        variant: "destructive",
      });
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || sendingMessage) return;

    setSendingMessage(true);
    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: selectedConversation.id,
          sender_id: user?.id,
          content: newMessage.trim(),
          message_type: 'text'
        });

      if (error) throw error;

      setNewMessage('');
      await fetchMessages(selectedConversation.id);
      await fetchConversations(); // Update conversation list with new timestamp
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setSendingMessage(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const filteredUsers = users.filter(user =>
    `${user.first_name} ${user.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getUserInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'manager': return 'default';
      default: return 'secondary';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading conversations...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex gap-6 h-[700px]">
        {/* Conversations and Users Sidebar */}
        <div className="w-1/3 space-y-4">
          {/* Conversations List */}
          <Card className="h-1/2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Conversations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[250px]">
                {conversations.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    No conversations yet
                  </div>
                ) : (
                  <div className="space-y-2">
                    {conversations.map((conversation) => (
                      <div
                        key={conversation.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedConversation?.id === conversation.id
                            ? 'bg-primary/10 border-primary'
                            : 'hover:bg-muted'
                        }`}
                        onClick={() => setSelectedConversation(conversation)}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">
                              {conversation.type === 'direct' && conversation.other_user
                                ? getUserInitials(conversation.other_user.first_name, conversation.other_user.last_name)
                                : <Users className="h-4 w-4" />
                              }
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm">
                              {conversation.type === 'direct' && conversation.other_user
                                ? `${conversation.other_user.first_name} ${conversation.other_user.last_name}`
                                : conversation.title || 'Group Chat'
                              }
                            </div>
                            {conversation.last_message && (
                              <div className="text-xs text-muted-foreground truncate">
                                {conversation.last_message.content}
                              </div>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {conversation.updated_at && format(new Date(conversation.updated_at), 'HH:mm')}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Users List */}
          <Card className="h-1/2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Start New Conversation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2">
                    {filteredUsers.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer"
                        onClick={() => startDirectConversation(user.id)}
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {getUserInitials(user.first_name, user.last_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">
                            {user.first_name} {user.last_name}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {user.email}
                          </div>
                        </div>
                        <Badge variant={getRoleBadgeVariant(user.role)} className="text-xs">
                          {user.role}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Chat Area */}
        <div className="flex-1">
          <Card className="h-full flex flex-col">
            {selectedConversation ? (
              <>
                {/* Chat Header */}
                <CardHeader className="border-b">
                  <CardTitle className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {selectedConversation.type === 'direct' && selectedConversation.other_user
                          ? getUserInitials(selectedConversation.other_user.first_name, selectedConversation.other_user.last_name)
                          : <Users className="h-4 w-4" />
                        }
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">
                        {selectedConversation.type === 'direct' && selectedConversation.other_user
                          ? `${selectedConversation.other_user.first_name} ${selectedConversation.other_user.last_name}`
                          : selectedConversation.title || 'Group Chat'
                        }
                      </div>
                      {selectedConversation.type === 'direct' && selectedConversation.other_user && (
                        <div className="text-sm text-muted-foreground">
                          {selectedConversation.other_user.email}
                        </div>
                      )}
                    </div>
                  </CardTitle>
                </CardHeader>

                {/* Messages */}
                <CardContent className="flex-1 overflow-hidden p-0">
                  <ScrollArea className="h-full p-4">
                    <div className="space-y-4">
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${message.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`max-w-[70%] ${message.sender_id === user?.id ? 'order-2' : 'order-1'}`}>
                            <div
                              className={`rounded-lg p-3 ${
                                message.sender_id === user?.id
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted'
                              }`}
                            >
                              {message.sender_id !== user?.id && (
                                <div className="text-xs text-muted-foreground mb-1">
                                  {message.sender?.first_name} {message.sender?.last_name}
                                </div>
                              )}
                              <div className="text-sm">{message.content}</div>
                              <div className={`text-xs mt-1 ${
                                message.sender_id === user?.id 
                                  ? 'text-primary-foreground/70' 
                                  : 'text-muted-foreground'
                              }`}>
                                {format(new Date(message.created_at), 'HH:mm')}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>
                </CardContent>

                {/* Message Input */}
                <div className="border-t p-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Type a message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      disabled={sendingMessage}
                      className="flex-1"
                    />
                    <Button 
                      onClick={sendMessage} 
                      disabled={!newMessage.trim() || sendingMessage}
                      size="icon"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <div className="text-lg font-medium mb-2">Select a conversation</div>
                  <div className="text-sm">
                    Choose a conversation from the sidebar or start a new one
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Messages;
