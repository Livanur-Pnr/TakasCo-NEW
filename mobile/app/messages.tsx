import { useCallback, useEffect, useRef, useState } from 'react';
import { FadeInUp } from '@/components/ui/motion';
import { ActivityIndicator, Image, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { TextInput } from '@/components/ui/text-input';
import { TouchableOpacity } from '@/components/ui/touchable';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { StorefrontHeader } from '@/components/web-storefront';
import { ReportModal } from '@/components/report-modal';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { useIsDesktopWeb } from '@/hooks/use-is-desktop-web';
import { usePolling } from '@/hooks/use-polling';
import { useRealtimeEvent, useTyping } from '@/utils/realtime';
import { useTheme } from '@/hooks/use-theme';
import { api, getImageUrl } from '@/utils/api';
import { Alert } from '@/utils/alert';
import * as SecureStore from '@/utils/storage';
import { timeAgo } from '@/utils/date';
import { usePageTitle } from '@/utils/use-page-title';

interface Person { id: number; name: string; profile_photo_path: string | null }
interface Conversation {
  id: number;
  other_user: Person;
  product: { id: number; title: string } | null;
  last_message: { body: string; sender_id: number; created_at: string } | null;
  unread_count: number;
}
interface ChatMessage { id: number; sender_id: number; body: string; created_at: string; read_at?: string | null }

function Avatar({ person, size = 40 }: { person: Person; size?: number }) {
  const theme = useTheme();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: theme.backgroundSelected, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' }}>
      {person.profile_photo_path ? (
        <Image source={{ uri: getImageUrl(person.profile_photo_path) || undefined }} style={{ width: '100%', height: '100%' }} />
      ) : (
        <IconSymbol name="person.fill" size={size * 0.5} color={theme.textSecondary} />
      )}
    </View>
  );
}

function ChatPane({ conversationId, me, onBack }: { conversationId: number; me: number | null; onBack?: () => void }) {
  const theme = useTheme();
  const router = useRouter();
  const [other, setOther] = useState<Person | null>(null);
  const [product, setProduct] = useState<{ id: number; title: string } | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const knownIds = useRef<Set<number>>(new Set());
  const baselineSet = useRef(false);
  const animateNew = baselineSet.current;
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [blockedByMe, setBlockedByMe] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const lastIdRef = useRef(0);

  // ilk çağrıda son 100 mesaj, sonrakilerde yalnızca yeni gelenler (`after`) alınır
  const load = useCallback(async () => {
    try {
      const after = lastIdRef.current;
      const res = await api.get(`/conversations/${conversationId}/messages`, { params: after ? { after } : undefined });
      setBlocked(!!res.data.blocked);
      setBlockedByMe(!!res.data.blocked_by_me);
      setOther(res.data.other_user);
      setProduct(res.data.product);
      const incoming: ChatMessage[] = res.data.data;
      if (after === 0) {
        setHasMore(!!res.data.has_more);
        setMessages(incoming);
      } else if (incoming.length > 0) {
        setMessages((prev) => {
          const known = new Set(prev.map((m) => m.id));
          return [...prev, ...incoming.filter((m) => !known.has(m.id))];
        });
      }
      if (incoming.length > 0) lastIdRef.current = Math.max(lastIdRef.current, incoming[incoming.length - 1].id);
    } catch (e: any) {
      if (e.response?.status === 404) onBack?.();
    } finally {
      setLoading(false);
    }
  }, [conversationId, onBack]);

  useEffect(() => {
    lastIdRef.current = 0;
    setLoading(true);
    setMessages([]);
    knownIds.current = new Set();
    baselineSet.current = false;
  }, [conversationId]);

  useEffect(() => {
    if (messages.length === 0) return;
    messages.forEach((m) => knownIds.current.add(m.id));
    baselineSet.current = true;
  }, [messages]);

  // daha eski mesajları yukarıya ekler (başlangıçta yalnızca son 100 mesaj gelir)
  const loadOlder = async () => {
    if (loadingOlder || messages.length === 0) return;
    setLoadingOlder(true);
    try {
      const res = await api.get(`/conversations/${conversationId}/messages`, { params: { before: messages[0].id } });
      const older: ChatMessage[] = res.data.data;
      setMessages((prev) => {
        const known = new Set(prev.map((m) => m.id));
        return [...older.filter((m) => !known.has(m.id)), ...prev];
      });
      setHasMore(!!res.data.has_more);
    } catch {
      // interceptor gerekli mesajı gösterir
    } finally {
      setLoadingOlder(false);
    }
  };

  // Karşı taraf mesajları okuyunca benim gönderdiklerim "okundu" olur
  useRealtimeEvent(`conversation.${conversationId}`, '.messages.read', () => {
    const now = new Date().toISOString();
    setMessages((prev) => prev.map((m) => (m.sender_id === me && !m.read_at ? { ...m, read_at: now } : m)));
  });
  const { typing, notifyTyping } = useTyping(`conversation.${conversationId}`, me);

  // Reverb bağlıyken yeni mesaj olayı gelince yalnızca yeni mesajlar çekilir; polling seyrek bir güvence olarak kalır
  const realtime = useRealtimeEvent(`conversation.${conversationId}`, '.message.sent', () => { load(); });
  usePolling(load, realtime ? 30000 : 5000, true, conversationId);

  const sendingRef = useRef(false);

  const send = async () => {
    const body = text.trim();
    // ref: Enter ve buton aynı anda tetiklense bile çift gönderimi engeller
    if (!body || sendingRef.current) return;
    sendingRef.current = true;
    setSending(true);
    setText('');
    try {
      const res = await api.post(`/conversations/${conversationId}/messages`, { body });
      setMessages((prev) => (prev.some((m) => m.id === res.data.id) ? prev : [...prev, res.data]));
      lastIdRef.current = Math.max(lastIdRef.current, res.data.id);
    } catch (e: any) {
      setText(body); // gönderilemediyse yazdığı metin kaybolmasın
      const errors = e.response?.data?.errors;
      Alert.alert('Hata', errors ? Object.values(errors).flat().join(' ') : e.response?.data?.message || 'Mesaj gönderilemedi.');
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  const toggleBlock = () => {
    if (!other) return;
    const unblock = blockedByMe;
    Alert.alert(
      unblock ? 'Engeli Kaldır' : 'Kullanıcıyı Engelle',
      unblock
        ? `${other.name} kullanıcısının engeli kaldırılsın mı?`
        : `${other.name} ile mesajlaşma ve takas teklifleri kapatılacak. Devam edilsin mi?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: unblock ? 'Engeli Kaldır' : 'Engelle',
          style: unblock ? 'default' : 'destructive',
          onPress: async () => {
            try {
              if (unblock) await api.delete(`/users/${other.id}/block`);
              else await api.post(`/users/${other.id}/block`);
              await load();
            } catch (e: any) {
              Alert.alert('Hata', e.response?.data?.message || 'İşlem tamamlanamadı.');
            }
          },
        },
      ],
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={[styles.chatHeader, { borderBottomColor: theme.border }]}>
        {onBack && (
          <TouchableOpacity onPress={onBack} accessibilityRole="button" accessibilityLabel="Konuşmalara dön">
            <IconSymbol name="chevron.left" size={24} color={theme.text} />
          </TouchableOpacity>
        )}
        {other && <Avatar person={other} />}
        <View style={{ flex: 1 }}>
          <ThemedText style={{ fontWeight: '700' }}>{other?.name ?? ''}</ThemedText>
          {!!product && (
            <TouchableOpacity onPress={() => router.push(`/product/${product.id}`)} accessibilityRole="link">
              <ThemedText style={{ color: Brand.accent, fontSize: 12 }} numberOfLines={1}>İlan: {product.title}</ThemedText>
            </TouchableOpacity>
          )}
        </View>
        {other && (
          <>
            <TouchableOpacity onPress={() => setReportOpen(true)} accessibilityRole="button" accessibilityLabel="Kullanıcıyı şikayet et" style={{ padding: Spacing.two }}>
              <IconSymbol name="flag.fill" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={toggleBlock} accessibilityRole="button" style={{ padding: Spacing.two }}>
              <ThemedText style={{ fontSize: 13, color: blockedByMe ? Brand.accent : Brand.danger, fontWeight: '600' }}>{blockedByMe ? 'Engeli Kaldır' : 'Engelle'}</ThemedText>
            </TouchableOpacity>
          </>
        )}
      </View>

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: Spacing.four, gap: Spacing.two, flexGrow: 1, justifyContent: messages.length ? 'flex-end' : 'center' }}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
      >
        {hasMore && !loading && (
          <TouchableOpacity onPress={loadOlder} disabled={loadingOlder} accessibilityRole="button" style={{ alignSelf: 'center', padding: Spacing.two }}>
            {loadingOlder ? <ActivityIndicator color={Brand.accent} /> : <ThemedText style={{ color: Brand.accent, fontWeight: '700', fontSize: 13 }}>Önceki mesajları yükle</ThemedText>}
          </TouchableOpacity>
        )}
        {loading ? (
          <ActivityIndicator color={Brand.accent} />
        ) : messages.length === 0 ? (
          <ThemedText style={{ color: theme.textSecondary, textAlign: 'center' }}>Henüz mesaj yok. İlk mesajı sen gönder.</ThemedText>
        ) : (
          messages.map((m) => {
            const mine = m.sender_id === me;
            const Row: any = animateNew && !knownIds.current.has(m.id) ? FadeInUp : View;
            return (
              <Row key={m.id} style={[styles.bubbleRow, { justifyContent: mine ? 'flex-end' : 'flex-start' }]} {...(Row === FadeInUp ? { distance: 8 } : null)}>
                <View style={[styles.bubble, { backgroundColor: mine ? Brand.accent : theme.backgroundSelected }]}>
                  <ThemedText style={{ color: mine ? '#fff' : theme.text }}>{m.body}</ThemedText>
                  <ThemedText style={{ color: mine ? 'rgba(255,255,255,0.75)' : theme.textSecondary, fontSize: 10, marginTop: 2 }}>
                    {timeAgo(m.created_at)}{mine ? (m.read_at ? '  ✓✓' : '  ✓') : ''}
                  </ThemedText>
                </View>
              </Row>
            );
          })
        )}
        {typing && <ThemedText style={{ color: theme.textSecondary, fontSize: 12, fontStyle: 'italic' }}>{other?.name ?? 'Karşı taraf'} yazıyor…</ThemedText>}
      </ScrollView>

      {blocked ? (
        <View style={[styles.composer, { borderTopColor: theme.border, justifyContent: 'center' }]}>
          <ThemedText style={{ color: theme.textSecondary, fontSize: 13, textAlign: 'center' }}>
            {blockedByMe ? 'Bu kullanıcıyı engelledin. Mesaj göndermek için engeli kaldır.' : 'Bu kullanıcıya mesaj gönderemezsin.'}
          </ThemedText>
        </View>
      ) : (
      <View style={[styles.composer, { borderTopColor: theme.border }]}>
        <TextInput
          style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text }]}
          placeholder="Mesajını yaz..."
          placeholderTextColor={theme.textSecondary}
          value={text}
          onChangeText={(t) => { setText(t); if (t) notifyTyping(); }}
          onSubmitEditing={send}
          onKeyPress={Platform.OS === 'web' ? (e: any) => { if (e.nativeEvent.key === 'Enter' && !e.nativeEvent.shiftKey) { e.preventDefault?.(); send(); } } : undefined}
          maxLength={1000}
          returnKeyType="send"
          accessibilityLabel="Mesaj yaz"
        />
        <TouchableOpacity
          onPress={send}
          disabled={!text.trim() || sending}
          accessibilityRole="button"
          accessibilityLabel="Gönder"
          style={[styles.sendBtn, { backgroundColor: text.trim() ? Brand.accent : theme.backgroundSelected }]}
        >
          {sending ? <ActivityIndicator color="#fff" /> : <IconSymbol name="paperplane.fill" size={20} color={text.trim() ? '#fff' : theme.textSecondary} />}
        </TouchableOpacity>
      </View>
      )}
      {other && <ReportModal visible={reportOpen} onClose={() => setReportOpen(false)} targetType="user" targetId={other.id} title={other.name} />}
    </View>
  );
}

export default function MessagesScreen() {
  const theme = useTheme();
  const router = useRouter();
  const isDesktopWeb = useIsDesktopWeb();
  const params = useLocalSearchParams<{ c?: string }>();
  const selectedId = params.c ? Number(params.c) : null;
  usePageTitle('Mesajlarım');

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<number | null>(null);

  useEffect(() => {
    SecureStore.getItemAsync('user').then((raw) => {
      try { setMe(raw ? JSON.parse(raw).id : null); } catch { setMe(null); }
    });
  }, []);

  const loadList = useCallback(async () => {
    try {
      const res = await api.get('/conversations');
      setConversations(res.data.data);
    } catch {
      // interceptor gerekli mesajı gösterir
    } finally {
      setLoading(false);
    }
  }, []);

  const listRealtime = useRealtimeEvent(me ? `App.Models.User.${me}` : null, '.message.sent', () => { loadList(); });
  usePolling(loadList, listRealtime ? 60000 : 15000);

  const open = (id: number) => router.setParams({ c: String(id) });
  const closeChat = useCallback(() => router.setParams({ c: '' }), [router]);

  const list = (
    <View style={{ flex: 1 }}>
      {loading ? (
        <ActivityIndicator color={Brand.accent} style={{ marginTop: Spacing.six }} />
      ) : conversations.length === 0 ? (
        <View style={{ alignItems: 'center', padding: Spacing.six, gap: Spacing.three }}>
          <IconSymbol name="bubble.left.fill" size={44} color={theme.textSecondary} />
          <ThemedText style={{ color: theme.textSecondary, textAlign: 'center' }}>
            Henüz bir konuşman yok. Bir ilanın sayfasından satıcıya mesaj gönderebilirsin.
          </ThemedText>
        </View>
      ) : (
        <ScrollView>
          {conversations.map((c) => (
            <TouchableOpacity
              key={c.id}
              onPress={() => open(c.id)}
              accessibilityRole="button"
              accessibilityLabel={`${c.other_user.name} ile konuşma${c.unread_count ? `, ${c.unread_count} okunmamış` : ''}`}
              style={[styles.convRow, { borderBottomColor: theme.border, backgroundColor: c.id === selectedId ? Brand.accent + '12' : 'transparent' }]}
            >
              <Avatar person={c.other_user} size={44} />
              <View style={{ flex: 1, gap: 2 }}>
                <ThemedText style={{ fontWeight: c.unread_count ? '800' : '600' }} numberOfLines={1}>{c.other_user.name}</ThemedText>
                {!!c.product && <ThemedText style={{ fontSize: 11, color: Brand.accent }} numberOfLines={1}>{c.product.title}</ThemedText>}
                <ThemedText style={{ fontSize: 13, color: theme.textSecondary }} numberOfLines={1}>{c.last_message?.body ?? 'Konuşma başlatıldı'}</ThemedText>
              </View>
              {c.unread_count > 0 && (
                <View style={styles.unreadBadge}>
                  <ThemedText style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>{c.unread_count}</ThemedText>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );

  if (isDesktopWeb) {
    return (
      <ThemedView style={{ flex: 1 }}>
        <StorefrontHeader />
        <View style={styles.desktopPage}>
          <View style={[styles.listPane, { borderColor: theme.border, backgroundColor: theme.cardBg }]}>
            <ThemedText type="defaultSemiBold" style={{ fontSize: 17, padding: Spacing.four }}>Mesajlarım</ThemedText>
            {list}
          </View>
          <View style={[styles.chatPane, { borderColor: theme.border, backgroundColor: theme.cardBg }]}>
            {selectedId ? (
              <ChatPane key={selectedId} conversationId={selectedId} me={me} onBack={undefined} />
            ) : (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.three }}>
                <IconSymbol name="bubble.left.fill" size={48} color={theme.textSecondary} />
                <ThemedText style={{ color: theme.textSecondary }}>Bir konuşma seç.</ThemedText>
              </View>
            )}
          </View>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      {selectedId ? (
        <View style={{ flex: 1, paddingTop: Spacing.six }}>
          <ChatPane key={selectedId} conversationId={selectedId} me={me} onBack={closeChat} />
        </View>
      ) : (
        <>
          <View style={[styles.mobileHeader, { backgroundColor: theme.backgroundElement }]}>
            <TouchableOpacity onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/profile'))} accessibilityRole="button" accessibilityLabel="Geri">
              <IconSymbol name="chevron.left" size={24} color={theme.text} />
            </TouchableOpacity>
            <ThemedText type="title" style={{ fontSize: 20, color: Brand.wordmark }}>Mesajlarım</ThemedText>
            <View style={{ width: 24 }} />
          </View>
          {list}
        </>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  desktopPage: { flex: 1, flexDirection: 'row', gap: Spacing.four, padding: Spacing.six, maxWidth: 1200, width: '100%', alignSelf: 'center' },
  listPane: { width: 340, borderWidth: 1, borderRadius: Radius.lg, overflow: 'hidden' },
  chatPane: { flex: 1, borderWidth: 1, borderRadius: Radius.lg, overflow: 'hidden' },
  mobileHeader: { padding: Spacing.four, paddingTop: Spacing.eight, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  convRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.four, borderBottomWidth: 1 },
  unreadBadge: { minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 6, backgroundColor: Brand.accent, justifyContent: 'center', alignItems: 'center' },
  chatHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.four, borderBottomWidth: 1 },
  bubbleRow: { flexDirection: 'row' },
  bubble: { maxWidth: '78%', paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: Radius.lg },
  composer: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, padding: Spacing.three, borderTopWidth: 1 },
  input: { flex: 1, borderWidth: 1, borderRadius: Radius.full, paddingHorizontal: Spacing.four, height: 44, fontSize: 15 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
});
