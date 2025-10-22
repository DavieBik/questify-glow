import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { format } from 'date-fns';
import { MessageCircle, Search, Send, Trash2, Users, Loader2 } from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

interface UserSummary {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
}

interface Conversation {
  id: string;
  title?: string | null;
  type: 'direct' | 'group';
  created_by: string;
  created_at: string;
  updated_at: string;
  other_user?: UserSummary;
  participant_count?: number;
  last_message?: {
    id: string;
    content: string;
    created_at: string;
    sender_id: string;
    sender_name: string;
  };
  last_read_at?: string | null;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: 'text' | 'file' | 'image';
  file_url?: string | null;
  created_at: string;
  sender?: UserSummary;
}

const Messages: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [contacts, setContacts] = useState<UserSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingConversation, setDeletingConversation] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const feedChannelRef = useRef<RealtimeChannel | null>(null);
  const conversationChannelRef = useRef<RealtimeChannel | null>(null);
  const selectedConversationRef = useRef<string | null>(null);

  const safeUserId = user?.id ?? null;

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    selectedConversationRef.current = selectedConversation?.id ?? null;
  }, [selectedConversation]);

  const mapMessage = useCallback(
    (raw: any): Message => ({
      id: raw.id,
      conversation_id: raw.conversation_id,
      sender_id: raw.sender_id,
      content: raw.content,
      message_type: raw.message_type,
      file_url: raw.file_url,
      created_at: raw.created_at,
      sender: raw.users
        ? {
            id: raw.users.id,
            first_name: raw.users.first_name,
            last_name: raw.users.last_name,
            email: raw.users.email,
            role: raw.users.role ?? 'worker',
          }
        : undefined,
    }),
    [],
  );

  const formatSenderName = (firstName?: string | null, lastName?: string | null) => {
    const first = firstName ?? '';
    const last = lastName ?? '';
    const combined = `${first} ${last}`.trim();
    return combined.length ? combined : 'Someone';
  };

  const mapConversation = useCallback(
    (raw: any): Conversation | null => {
      if (!safeUserId) {
        return null;
      }
      const participants = (raw.conversation_participants ?? []) as any[];
      const selfParticipant = participants.find((participant) => participant.user_id === safeUserId);
      if (!selfParticipant || selfParticipant.is_archived) {
        return null;
      }

      const otherParticipant = participants
        .map((participant) => participant.users)
        .find((participantUser) => participantUser && participantUser.id !== safeUserId);

      const lastMessageRow = (raw.messages ?? [])[0];

      return {
        id: raw.id,
        title: raw.title,
        type: raw.type,
        created_by: raw.created_by,
        created_at: raw.created_at,
        updated_at: raw.updated_at,
        participant_count: participants.length,
        other_user:
          raw.type === 'direct' && otherParticipant
            ? {
                id: otherParticipant.id,
                first_name: otherParticipant.first_name,
                last_name: otherParticipant.last_name,
                email: otherParticipant.email,
                role: otherParticipant.role ?? 'worker',
              }
            : undefined,
        last_message: lastMessageRow
          ? {
              id: lastMessageRow.id,
              content: lastMessageRow.content,
              created_at: lastMessageRow.created_at,
              sender_id: lastMessageRow.sender_id,
              sender_name: formatSenderName(
                lastMessageRow.users?.first_name,
                lastMessageRow.users?.last_name,
              ),
            }
          : undefined,
        last_read_at: selfParticipant.last_read_at,
      };
    },
    [safeUserId],
  );
  const fetchConversations = useCallback(
    async (options?: { quiet?: boolean }) => {
      if (!safeUserId) {
        return;
      }

      const showSpinner = !options?.quiet;
      if (showSpinner) {
        setLoadingConversations(true);
      }

      try {
        const query = supabase
          .from('conversations')
          .select(`
            id,
            title,
            type,
            created_by,
            created_at,
            updated_at,
            conversation_participants!inner (
              user_id,
              last_read_at,
              is_archived,
              users!inner (
                id,
                first_name,
                last_name,
                email,
                role
              )
            ),
            messages (
              id,
              content,
              created_at,
              sender_id,
              users!inner (
                first_name,
                last_name
              )
            )
          `)
          .eq('conversation_participants.user_id', safeUserId)
          .is('conversation_participants.is_archived', false)
          .order('updated_at', { ascending: false })
          .order('created_at', { foreignTable: 'messages', ascending: false })
          .limit(1, { foreignTable: 'messages' });

        const { data, error } = await query;

        if (error) {
          throw error;
        }

        const formatted = (data ?? [])
          .map(mapConversation)
          .filter((conversation): conversation is Conversation => Boolean(conversation));

        setConversations(formatted);

        if (
          selectedConversationRef.current &&
          !formatted.some((conversation) => conversation.id === selectedConversationRef.current)
        ) {
          setSelectedConversation(null);
          setMessages([]);
        }
      } catch (error) {
        console.error('Error fetching conversations:', error);
        toast({
          title: 'Unable to load conversations',
          description: 'Something went wrong while loading your conversations.',
          variant: 'destructive',
        });
      } finally {
        if (showSpinner) {
          setLoadingConversations(false);
        }
      }
    },
    [mapConversation, safeUserId, toast],
  );

  const fetchMessages = useCallback(
    async (conversationId: string, options?: { quiet?: boolean }) => {
      const showSpinner = !options?.quiet;
      if (showSpinner) {
        setLoadingMessages(true);
      }

      try {
        const { data, error } = await supabase
          .from('messages')
          .select(`
            id,
            conversation_id,
            sender_id,
            content,
            message_type,
            file_url,
            created_at,
            users (
              id,
              first_name,
              last_name,
              email,
              role
            )
          `)
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true });

        if (error) {
          throw error;
        }

        setMessages((data ?? []).map(mapMessage));
      } catch (error) {
        console.error('Error fetching messages:', error);
        toast({
          title: 'Unable to load messages',
          description: 'Something went wrong while loading this conversation.',
          variant: 'destructive',
        });
      } finally {
        if (showSpinner) {
          setLoadingMessages(false);
        }
      }
    },
    [mapMessage, toast],
  );

  const fetchContacts = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('message_allowed_recipient_list');
      if (error) {
        throw error;
      }

      setContacts(
        (data ?? []).map((row: any) => ({
          id: row.id,
          first_name: row.first_name,
          last_name: row.last_name,
          email: row.email,
          role: row.role,
        })),
      );
    } catch (error) {
      console.error('Error fetching contacts:', error);
      toast({
        title: 'Unable to load contacts',
        description: 'We could not load the list of people you can message.',
        variant: 'destructive',
      });
    }
  }, [toast]);
  useEffect(() => {
    if (!safeUserId) {
      return;
    }

    fetchConversations();
    fetchContacts();
  }, [fetchContacts, fetchConversations, safeUserId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (!safeUserId) {
      return;
    }

    const channel = supabase
      .channel(`chat-feed-${safeUserId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const conversationId = (payload.new as any)?.conversation_id;
          if (!conversationId) {
            return;
          }

          fetchConversations({ quiet: true });

          if (!selectedConversationRef.current || selectedConversationRef.current !== conversationId) {
            toast({
              title: 'New message',
              description: 'You have a new chat message.',
            });
          }
        },
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'messages' },
        (payload) => {
          const conversationId = (payload.old as any)?.conversation_id;
          if (conversationId && selectedConversationRef.current === conversationId) {
            fetchMessages(conversationId, { quiet: true });
          }
        },
      )
      .subscribe();

    feedChannelRef.current = channel;

    return () => {
      if (feedChannelRef.current) {
        supabase.removeChannel(feedChannelRef.current);
        feedChannelRef.current = null;
      }
    };
  }, [fetchConversations, fetchMessages, safeUserId, toast]);

  const markAsRead = useCallback(
    async (conversationId: string, options?: { quiet?: boolean }) => {
      if (!safeUserId) {
        return;
      }

      try {
        const { error } = await supabase
          .from('conversation_participants')
          .update({ last_read_at: new Date().toISOString() })
          .eq('conversation_id', conversationId)
          .eq('user_id', safeUserId);

        if (error) {
          throw error;
        }

        setConversations((prev) =>
          prev.map((conversation) =>
            conversation.id === conversationId
              ? { ...conversation, last_read_at: new Date().toISOString() }
              : conversation,
          ),
        );
      } catch (error) {
        if (!options?.quiet) {
          console.error('Error marking conversation as read:', error);
        }
      }
    },
    [safeUserId],
  );

  useEffect(() => {
    if (!selectedConversation) {
      return;
    }

    fetchMessages(selectedConversation.id);
    markAsRead(selectedConversation.id);
  }, [fetchMessages, markAsRead, selectedConversation]);
  useEffect(() => {
    if (!selectedConversation) {
      if (conversationChannelRef.current) {
        supabase.removeChannel(conversationChannelRef.current);
        conversationChannelRef.current = null;
      }
      return;
    }

    if (conversationChannelRef.current) {
      supabase.removeChannel(conversationChannelRef.current);
      conversationChannelRef.current = null;
    }

    const channel = supabase
      .channel(`conversation-${selectedConversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${selectedConversation.id}`,
        },
        (payload) => {
          const mapped = mapMessage(payload.new);
          setMessages((prev) => [...prev, mapped]);
          scrollToBottom();

          if (mapped.sender_id !== safeUserId) {
            markAsRead(selectedConversation.id, { quiet: true });
          }
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${selectedConversation.id}`,
        },
        () => {
          fetchMessages(selectedConversation.id, { quiet: true });
        },
      )
      .subscribe();

    conversationChannelRef.current = channel;

    return () => {
      if (conversationChannelRef.current) {
        supabase.removeChannel(conversationChannelRef.current);
        conversationChannelRef.current = null;
      }
    };
  }, [fetchMessages, mapMessage, markAsRead, scrollToBottom, safeUserId, selectedConversation]);

  const sendMessage = useCallback(async () => {
    if (!selectedConversation || !safeUserId) {
      return;
    }

    const trimmed = newMessage.trim();
    if (!trimmed) {
      return;
    }

    setSendingMessage(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: selectedConversation.id,
          sender_id: safeUserId,
          content: trimmed,
          message_type: 'text',
        })
        .select(`
          id,
          conversation_id,
          sender_id,
          content,
          message_type,
          file_url,
          created_at,
          users (
            id,
            first_name,
            last_name,
            email,
            role
          )
        `)
        .single();

      if (error) {
        throw error;
      }

      const mapped = mapMessage(data);
      setMessages((prev) => [...prev, mapped]);
      setNewMessage('');
      scrollToBottom();
      markAsRead(selectedConversation.id, { quiet: true });
      fetchConversations({ quiet: true });
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Unable to send message',
        description: 'Something went wrong while sending your message. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSendingMessage(false);
    }
  }, [fetchConversations, mapMessage, markAsRead, newMessage, safeUserId, scrollToBottom, selectedConversation, toast]);

  const handleKeyPress = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
      }
    },
    [sendMessage],
  );

  const startDirectConversation = useCallback(
    async (otherUserId: string) => {
      if (!safeUserId || otherUserId === safeUserId) {
        return;
      }

      try {
        const { data, error } = await supabase.rpc('get_or_create_direct_conversation', {
          other_user_id: otherUserId,
        });

        if (error) {
          throw error;
        }

        await fetchConversations({ quiet: true });

        const createdConversationId = data as string;
        const found = conversations.find((conversation) => conversation.id === createdConversationId);

        if (found) {
          setSelectedConversation(found);
        } else {
          const { data: conversationData, error: fetchError } = await supabase
            .from('conversations')
            .select(`
              id,
              title,
              type,
              created_by,
              created_at,
              updated_at,
              conversation_participants (
                user_id,
                last_read_at,
                is_archived,
                users (
                  id,
                  first_name,
                  last_name,
                  email,
                  role
                )
              ),
              messages(order=created_at.desc, limit=1) (
                id,
                content,
                created_at,
                sender_id,
                users (
                  first_name,
                  last_name
                )
              )
            `)
            .eq('id', createdConversationId)
            .single();

          if (!fetchError) {
            const mapped = mapConversation(conversationData);
            if (mapped) {
              setConversations((prev) => [mapped, ...prev.filter((conversation) => conversation.id !== mapped.id)]);
              setSelectedConversation(mapped);
            }
          }
        }
      } catch (error: any) {
        console.error('Error starting conversation:', error);
        toast({
          title: 'Unable to start conversation',
          description: error?.message?.includes('not permitted')
            ? "You're not permitted to message that user."
            : 'Something went wrong while creating this conversation.',
          variant: 'destructive',
        });
      }
    },
    [conversations, fetchConversations, mapConversation, safeUserId, toast],
  );
  const handleDeleteConversation = useCallback(async () => {
    if (!selectedConversation || !safeUserId) {
      return;
    }

    setDeletingConversation(true);

    try {
      const { error } = await supabase
        .from('conversation_participants')
        .update({
          is_archived: true,
          archived_at: new Date().toISOString(),
          archived_by: safeUserId,
        })
        .eq('conversation_id', selectedConversation.id)
        .eq('user_id', safeUserId);

      if (error) {
        throw error;
      }

      setConversations((prev) => prev.filter((conversation) => conversation.id !== selectedConversation.id));
      setSelectedConversation(null);
      setMessages([]);
      setDeleteDialogOpen(false);

      toast({
        title: 'Conversation removed',
        description: 'The conversation has been removed from your inbox.',
      });
    } catch (error) {
      console.error('Error removing conversation:', error);
      toast({
        title: 'Unable to remove conversation',
        description: 'Something went wrong while removing this conversation.',
        variant: 'destructive',
      });
    } finally {
      setDeletingConversation(false);
    }
  }, [safeUserId, selectedConversation, toast]);

  const filteredContacts = useMemo(() => {
    if (!searchQuery.trim()) {
      return contacts;
    }

    const query = searchQuery.trim().toLowerCase();
    return contacts.filter(
      (contact) =>
        `${contact.first_name} ${contact.last_name}`.toLowerCase().includes(query) ||
        contact.email.toLowerCase().includes(query),
    );
  }, [contacts, searchQuery]);

  const getConversationTitle = useCallback((conversation: Conversation) => {
    if (conversation.type === 'direct' && conversation.other_user) {
      return `${conversation.other_user.first_name} ${conversation.other_user.last_name}`.trim();
    }
    return conversation.title || 'Group Chat';
  }, []);

  const getConversationSubtitle = useCallback((conversation: Conversation) => {
    if (conversation.last_message) {
      return conversation.last_message.content;
    }
    if (conversation.type === 'group' && typeof conversation.participant_count === 'number') {
      return `${conversation.participant_count} participant${conversation.participant_count === 1 ? '' : 's'}`;
    }
    return 'Start chatting';
  }, []);

  const hasUnreadMessages = useCallback((conversation: Conversation) => {
    if (!conversation.last_message) {
      return false;
    }
    if (!conversation.last_read_at) {
      return true;
    }
    return new Date(conversation.last_message.created_at) > new Date(conversation.last_read_at);
  }, []);

  const renderConversationList = () => {
    if (loadingConversations) {
      return (
        <div className="flex h-full items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (!conversations.length) {
      return (
        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
          No conversations yet – start one below.
        </div>
      );
    }

    return conversations.map((conversation) => {
      const isActive = selectedConversation?.id === conversation.id;
      const unread = hasUnreadMessages(conversation);

      return (
        <button
          key={conversation.id}
          type="button"
          onClick={() => setSelectedConversation(conversation)}
          className={`flex w-full flex-col gap-1 rounded-xl border px-4 py-3 text-left transition ${
            isActive ? 'border-primary bg-primary/10' : 'border-border bg-background hover:bg-muted'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs">
                  {conversation.type === 'direct' && conversation.other_user ? (
                    `${conversation.other_user.first_name?.[0] ?? ''}${conversation.other_user.last_name?.[0] ?? ''}`.toUpperCase()
                  ) : (
                    <Users className="h-4 w-4" />
                  )}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium">{getConversationTitle(conversation)}</span>
            </div>
            {conversation.last_message && (
              <span className="text-xs text-muted-foreground">
                {format(new Date(conversation.last_message.created_at), 'HH:mm')}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className={`line-clamp-1 text-sm ${unread ? 'font-medium' : 'text-muted-foreground'}`}>
              {getConversationSubtitle(conversation)}
            </span>
            {unread && <Badge variant="default">New</Badge>}
          </div>
        </button>
      );
    });
  };
  return (
    <div className="container mx-auto p-6">
      <div className="flex h-[700px] gap-6">
        <div className="flex w-1/3 flex-col gap-4">
          <Card className="flex-1">
            <CardHeader>
              <CardTitle className="text-lg">Conversations</CardTitle>
            </CardHeader>
            <CardContent className="h-full">
              <ScrollArea className="h-full">{renderConversationList()}</ScrollArea>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Start New Conversation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="pl-9"
                />
              </div>
              <ScrollArea className="h-60 pr-2">
                <div className="space-y-2">
                  {filteredContacts.map((contact) => (
                    <button
                      key={contact.id}
                      type="button"
                      onClick={() => startDirectConversation(contact.id)}
                      className="flex w-full items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-left transition hover:border-primary hover:bg-primary/5"
                    >
                      <div>
                        <div className="font-medium">
                          {contact.first_name} {contact.last_name}
                        </div>
                        <div className="text-xs text-muted-foreground">{contact.email}</div>
                      </div>
                      <Badge variant="secondary" className="text-xs capitalize">
                        {contact.role}
                      </Badge>
                    </button>
                  ))}
                  {!filteredContacts.length && (
                    <div className="py-6 text-center text-sm text-muted-foreground">
                      No users match that search.
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-1 flex-col">
          <Card className="flex h-full flex-col">
            {selectedConversation ? (
              <>
                <CardHeader className="flex items-center justify-between border-b">
                  <CardTitle className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {selectedConversation.type === 'direct' && selectedConversation.other_user ? (
                          `${selectedConversation.other_user.first_name?.[0] ?? ''}${selectedConversation.other_user.last_name?.[0] ?? ''}`.toUpperCase()
                        ) : (
                          <Users className="h-4 w-4" />
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{getConversationTitle(selectedConversation)}</div>
                      {selectedConversation.type === 'direct' && selectedConversation.other_user && (
                        <div className="text-sm text-muted-foreground">
                          {selectedConversation.other_user.email}
                        </div>
                      )}
                    </div>
                  </CardTitle>
                  <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" title="Remove conversation">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remove conversation?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will remove the conversation from your inbox. Other participants will keep their copy.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel disabled={deletingConversation}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={handleDeleteConversation}
                          disabled={deletingConversation}
                        >
                          {deletingConversation ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                          Remove
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardHeader>

                <CardContent className="flex-1 overflow-hidden p-0">
                  <ScrollArea className="h-full p-4">
                    {loadingMessages ? (
                      <div className="flex h-full items-center justify-center">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {messages.map((message) => (
                          <div
                            key={message.id}
                            className={`flex ${message.sender_id === safeUserId ? 'justify-end' : 'justify-start'}`}
                          >
                            <div className={`max-w-[70%] ${message.sender_id === safeUserId ? 'order-2 text-right' : 'order-1 text-left'}`}>
                              <div
                                className={`rounded-lg p-3 ${
                                  message.sender_id === safeUserId
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted'
                                }`}
                              >
                                {message.sender_id !== safeUserId && message.sender && (
                                  <div className="mb-1 text-xs text-muted-foreground">
                                    {message.sender.first_name} {message.sender.last_name}
                                  </div>
                                )}
                                <div className="text-sm">{message.content}</div>
                                <div
                                  className={`mt-1 text-xs ${
                                    message.sender_id === safeUserId
                                      ? 'text-primary-foreground/70'
                                      : 'text-muted-foreground'
                                  }`}
                                >
                                  {format(new Date(message.created_at), 'HH:mm')}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                        <div ref={messagesEndRef} />
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>

                <div className="border-t p-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Type a message..."
                      value={newMessage}
                      onChange={(event) => setNewMessage(event.target.value)}
                      onKeyDown={handleKeyPress}
                      disabled={sendingMessage}
                      className="flex-1"
                    />
                    <Button onClick={sendMessage} disabled={!newMessage.trim() || sendingMessage} size="icon">
                      {sendingMessage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
                <MessageCircle className="mb-4 h-12 w-12 opacity-60" />
                <div className="text-lg font-medium">Select a conversation</div>
                <div className="text-sm">Choose a conversation from the sidebar or start a new one.</div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Messages;
