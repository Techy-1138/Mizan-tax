// ============================================================================
// Mizan (ميزان) - AI Tax Assistant Chat (Screen 9)
// Monochrome FTA-grounded statutory Q&A with curated prompt chips, persistent
// conversation threads, statutory citation pills, and keyboard-avoiding composer.
// ============================================================================

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useBusiness } from '../../src/context/BusinessContext';
import { useTheme } from '../../src/context/ThemeContext';
import { useLocale } from '../../src/context/LocaleContext';
import { MizanApi } from '../../src/services/api';
import { borders, getFont, radii, spacing, typeScale } from '../../src/theme/tokens';
import { AppText, Badge, Button, ModalSheet, SlideIn } from '../../src/ui';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: string[];
}

const FALLBACK_PROMPTS_EN = [
  { id: 'sbr', prompt: 'Am I eligible for Small Business Relief (0% CT)?', tag: 'CT' },
  { id: 'ent', prompt: 'How does Art. 32 Entertainment 50% deduction work?', tag: 'CT' },
  { id: 'vat', prompt: 'What expenses qualify for Input VAT recovery?', tag: 'VAT' },
];

const FALLBACK_PROMPTS_AR = [
  { id: 'sbr', prompt: 'هل أنا مؤهل لإعفاء الأعمال الصغيرة (0%)؟', tag: 'CT' },
  { id: 'ent', prompt: 'كيف تُحتسب مصاريف الضيافة بنسبة 50%؟', tag: 'CT' },
  { id: 'vat', prompt: 'ما هي المصروفات القابلة لاسترداد ضريبة المدخلات؟', tag: 'VAT' },
];

/**
 * Monochrome FTA-grounded AI Tax Assistant Chat screen.
 */
export default function AiTaxChatScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { locale, isRTL } = useLocale();
  const { activeBusiness } = useBusiness();
  const scrollRef = useRef<any>(null);

  const [prompts, setPrompts] = useState<{ id: string; prompt: string; tag: string }[]>(
    isRTL ? FALLBACK_PROMPTS_AR : FALLBACK_PROMPTS_EN
  );
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [threadsOpen, setThreadsOpen] = useState(false);

  const inputFont = getFont('regular', isRTL, false);

  const loadInitialData = useCallback(async () => {
    const lang = locale === 'ar' ? 'ar' : 'en';
    const [promptsRes, convsRes] = await Promise.allSettled([
      MizanApi.getAiPrompts(lang),
      MizanApi.getAiConversations(activeBusiness?.id),
    ]);

    if (
      promptsRes.status === 'fulfilled' &&
      Array.isArray(promptsRes.value) &&
      promptsRes.value.length > 0
    ) {
      setPrompts(promptsRes.value.slice(0, 4));
    } else {
      setPrompts(isRTL ? FALLBACK_PROMPTS_AR : FALLBACK_PROMPTS_EN);
    }

    if (convsRes.status === 'fulfilled' && Array.isArray(convsRes.value)) {
      setConversations(convsRes.value);
    }
  }, [activeBusiness?.id, isRTL, locale]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  /** Loads an existing conversation thread */
  const handleSelectThread = async (convId: string) => {
    setThreadsOpen(false);
    setError(null);
    try {
      const conv = await MizanApi.getAiConversation(convId);
      setActiveConvId(convId);
      const rawMsgs = Array.isArray(conv?.messages) ? conv.messages : [];
      setMessages(
        rawMsgs.map((m: any, idx: number) => ({
          id: m.id || String(idx),
          role: (m.role || '').toLowerCase() === 'user' ? 'user' : 'assistant',
          content: m.content || '',
          citations: Array.isArray(m.citations) ? m.citations : undefined,
        }))
      );
    } catch (err: any) {
      setError(err?.message || 'Could not load conversation.');
    }
  };

  /** Starts a fresh conversation thread */
  const handleNewThread = () => {
    setActiveConvId(null);
    setMessages([]);
    setError(null);
    setThreadsOpen(false);
  };

  /** Sends user message to persistent conversation thread */
  const handleSend = async (overrideText?: string) => {
    const text = (overrideText ?? inputText).trim();
    if (!text || sending) return;

    setError(null);
    if (!overrideText) setInputText('');

    const optimisticUser: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: text,
    };
    setMessages((prev) => [...prev, optimisticUser]);
    setSending(true);

    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);

    try {
      let convId = activeConvId;
      if (!convId) {
        const created = await MizanApi.createAiConversation(
          activeBusiness?.id,
          text.slice(0, 48)
        );
        convId = created?.id;
        if (convId) {
          setActiveConvId(convId);
          setConversations((prev) => [created, ...prev]);
        }
      }

      if (!convId) {
        throw new Error('Could not initialize conversation thread.');
      }

      const reply = await MizanApi.sendAiConversationMessage(
        convId,
        text,
        activeBusiness?.id,
        locale === 'ar' ? 'ar' : 'en'
      );

      const assistantMsg: ChatMessage = {
        id: reply?.assistantMessage?.id || `a-${Date.now()}`,
        role: 'assistant',
        content:
          reply?.assistantMessage?.content ||
          reply?.answer ||
          reply?.content ||
          'No response returned.',
        citations:
          reply?.assistantMessage?.citations ||
          reply?.citations ||
          undefined,
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    } catch (err: any) {
      setError(
        err?.message ||
          (isRTL
            ? 'تعذر الاتصال بمساعد الضرائب. يرجى المحاولة مرة أخرى.'
            : 'Unable to reach Tax Assistant. Please try again.')
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={[styles.safe, { backgroundColor: colors.neutral.canvas }]}
    >
      {/* Top Bar */}
      <View
        style={[
          styles.topBar,
          { backgroundColor: colors.neutral.surface, borderBottomColor: colors.neutral.border },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          style={[styles.topBtn, { borderColor: colors.neutral.border }]}
        >
          <AppText variant="caption" weight="semiBold">
            {isRTL ? '→ رجوع' : '← Back'}
          </AppText>
        </Pressable>

        <View style={styles.topCenter}>
          <AppText variant="bodySmall" weight="bold">
            {isRTL ? 'مساعد ميزان الضريبي' : 'Mizan Tax AI'}
          </AppText>
          <AppText variant="caption" tone="muted">
            {isRTL ? 'مستند إلى تشريعات الهيئة' : 'FTA Statutory Grounded'}
          </AppText>
        </View>

        <Pressable
          onPress={() => setThreadsOpen(true)}
          style={[styles.topBtn, { borderColor: colors.neutral.border }]}
        >
          <AppText variant="caption" weight="semiBold">
            {isRTL ? 'المحادثات' : 'Threads'}
          </AppText>
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Chat Scroll Area */}
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.chatContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Curated Prompt Chips */}
          <View style={styles.promptWrap}>
            {prompts.map((p) => (
              <Pressable
                key={p.id}
                onPress={() => handleSend(p.prompt)}
                style={[
                  styles.promptChip,
                  {
                    backgroundColor: colors.neutral.surface,
                    borderColor: colors.neutral.border,
                  },
                ]}
              >
                <AppText variant="caption" weight="medium">
                  {p.prompt}
                </AppText>
              </Pressable>
            ))}
          </View>

          {messages.length === 0 ? (
            <View
              style={[
                styles.emptyBox,
                {
                  backgroundColor: colors.neutral.surface,
                  borderColor: colors.neutral.border,
                },
              ]}
            >
              <AppText variant="bodySmall" weight="semiBold">
                {isRTL ? 'اسأل عن القوانين الضريبية الإماراتية' : 'Ask UAE Statutory Tax Questions'}
              </AppText>
              <AppText variant="caption" tone="secondary">
                {isRTL
                  ? 'إجابات مستندة إلى المرسوم بقانون اتحادي 47/2022 و 8/2017.'
                  : 'Answers grounded in Federal Decree-Law No. 47/2022 (CT) & No. 8/2017 (VAT).'}
              </AppText>
            </View>
          ) : null}

          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <SlideIn
                key={msg.id}
                from="bottom"
                distance={8}
                style={[styles.msgRow, isUser ? styles.msgRowUser : styles.msgRowAi]}
              >
                <View
                  style={[
                    styles.bubble,
                    isUser
                      ? { backgroundColor: colors.brand.primary }
                      : {
                          backgroundColor: colors.neutral.surface,
                          borderColor: colors.neutral.border,
                          borderWidth: borders.hairline,
                        },
                  ]}
                >
                  <AppText variant="bodySmall" tone={isUser ? 'inverted' : 'primary'}>
                    {msg.content}
                  </AppText>

                  {!isUser && msg.citations && msg.citations.length > 0 ? (
                    <View style={[styles.citeRow, { borderTopColor: colors.neutral.border }]}>
                      {msg.citations.map((cite, i) => (
                        <Badge key={`${msg.id}-c-${i}`} label={cite} variant="outline" />
                      ))}
                    </View>
                  ) : null}
                </View>
              </SlideIn>
            );
          })}

          {sending ? (
            <View style={styles.typingRow}>
              <ActivityIndicator size="small" color={colors.neutral.textPrimary} />
              <AppText variant="caption" tone="muted">
                {isRTL ? 'جارٍ البحث في التشريعات...' : 'Checking FTA statutes...'}
              </AppText>
            </View>
          ) : null}

          {error ? (
            <View
              style={[
                styles.errorBox,
                {
                  backgroundColor: colors.neutral.surfaceSubtle,
                  borderColor: colors.neutral.borderStrong,
                },
              ]}
            >
              <AppText variant="caption" weight="semiBold">
                {error}
              </AppText>
            </View>
          ) : null}
        </ScrollView>

        {/* Bottom Composer */}
        <View
          style={[
            styles.composer,
            { backgroundColor: colors.neutral.surface, borderTopColor: colors.neutral.border },
          ]}
        >
          <TextInput
            value={inputText}
            onChangeText={setInputText}
            placeholder={
              isRTL ? 'اسأل عن ضريبة الشركات أو القيمة المضافة...' : 'Ask about UAE CT or VAT...'
            }
            placeholderTextColor={colors.neutral.textMuted}
            style={[
              styles.input,
              inputFont,
              {
                backgroundColor: colors.neutral.canvas,
                borderColor: colors.neutral.border,
                color: colors.neutral.textPrimary,
                textAlign: isRTL ? 'right' : 'left',
              },
            ]}
            multiline
          />
          <Button
            label={isRTL ? 'إرسال' : 'Send'}
            variant="primary"
            size="md"
            fullWidth={false}
            disabled={!inputText.trim() || sending}
            onPress={() => handleSend()}
          />
        </View>
      </KeyboardAvoidingView>

      {/* Conversation Threads ModalSheet */}
      <ModalSheet
        visible={threadsOpen}
        onClose={() => setThreadsOpen(false)}
        title={isRTL ? 'المحادثات السابقة' : 'Conversation Threads'}
      >
        <Button
          label={isRTL ? '+ محادثة جديدة' : '+ New Conversation'}
          variant="primary"
          onPress={handleNewThread}
        />
        {conversations.length === 0 ? (
          <AppText variant="caption" tone="secondary">
            {isRTL ? 'لا توجد محادثات محفوظة بعد.' : 'No saved conversations yet.'}
          </AppText>
        ) : (
          conversations.slice(0, 6).map((c) => (
            <Pressable
              key={c.id}
              onPress={() => handleSelectThread(c.id)}
              style={[
                styles.threadItem,
                {
                  borderColor:
                    c.id === activeConvId ? colors.neutral.borderStrong : colors.neutral.border,
                },
              ]}
            >
              <AppText variant="bodySmall" weight="semiBold" numberOfLines={1}>
                {c.title || 'Tax Inquiry'}
              </AppText>
              <AppText variant="caption" tone="muted" tabular>
                {(c.updatedAt || c.createdAt || '').toString().slice(0, 10)}
              </AppText>
            </Pressable>
          ))
        )}
      </ModalSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: borders.hairline,
  },
  topBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs + 2,
    borderRadius: radii.sm,
    borderWidth: borders.hairline,
  },
  topCenter: { alignItems: 'center' },
  chatContent: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  promptWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  promptChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs + 2,
    borderRadius: radii.pill,
    borderWidth: borders.hairline,
  },
  emptyBox: {
    borderWidth: borders.hairline,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: 4,
  },
  msgRow: { flexDirection: 'row' },
  msgRowUser: { justifyContent: 'flex-end' },
  msgRowAi: { justifyContent: 'flex-start' },
  bubble: {
    maxWidth: '86%',
    borderRadius: radii.lg,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  citeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xxs + 2,
    paddingTop: spacing.xs,
    borderTopWidth: borders.hairline,
  },
  typingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  errorBox: {
    borderWidth: borders.hairline,
    borderRadius: radii.sm,
    padding: spacing.sm,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.xs,
    padding: spacing.sm,
    borderTopWidth: borders.hairline,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderRadius: radii.md,
    borderWidth: borders.hairline,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    fontSize: typeScale.bodySmall.fontSize,
  },
  threadItem: {
    padding: spacing.sm,
    borderRadius: radii.md,
    borderWidth: borders.hairline,
    gap: 2,
  },
});
