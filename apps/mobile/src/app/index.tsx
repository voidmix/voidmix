import { useEffect, useState } from "react"
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { greet } from "@/lib/api"
import { useTheme } from "@/lib/theme"
import { useNativeAuth, restoreSession, signInWithWeb, signOut, cancelSignIn } from "@/lib/auth"

export default function HomeScreen() {
  const colors = useTheme()
  const auth = useNativeAuth()
  useEffect(() => {
    void restoreSession()
  }, [])
  const [count, setCount] = useState(0)
  const [message, setMessage] = useState("试试调用独立 API。")
  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState(false)

  async function callApi() {
    if (pending) return

    setPending(true)
    setFailed(false)
    try {
      const result = await greet()
      setMessage(result.message)
    } catch (error) {
      setFailed(true)
      setMessage(
        error instanceof Error && error.message.includes("EXPO_PUBLIC_API_URL")
          ? error.message
          : "连接失败，请确认 API 服务已启动后重试。",
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.content}>
          <View style={styles.heading}>
            <Text accessibilityRole="header" style={[styles.title, { color: colors.foreground }]}>
              Voidmix
            </Text>
            <Text style={[styles.body, { color: colors.muted }]}>项目已就绪，从这里开始构建。</Text>
          </View>

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`点击计数 ${count}`}
              onPress={() => setCount((value) => value + 1)}
              style={({ pressed }) => [
                styles.button,
                { backgroundColor: colors.primary, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Text style={[styles.buttonText, { color: colors.onPrimary }]}>点击计数 {count}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: count === 0 }}
              disabled={count === 0}
              onPress={() => setCount(0)}
              style={({ pressed }) => [
                styles.button,
                styles.outline,
                { borderColor: colors.border, opacity: count === 0 ? 0.4 : pressed ? 0.7 : 1 },
              ]}
            >
              <Text style={[styles.buttonText, { color: colors.foreground }]}>重置</Text>
            </Pressable>
          </View>

          <View style={[styles.api, { borderColor: colors.border }]}>
            <Text style={[styles.body, { color: colors.foreground }]}>
              {auth.user
                ? `${auth.user.name}\n${auth.user.email}`
                : "登录后，在不同设备上使用你的账户。"}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: auth.pending, busy: auth.pending }}
              disabled={auth.pending}
              onPress={auth.user ? signOut : signInWithWeb}
              style={({ pressed }) => [
                styles.button,
                styles.apiButton,
                { backgroundColor: colors.secondary, opacity: pressed || auth.pending ? 0.7 : 1 },
              ]}
            >
              {auth.pending && <ActivityIndicator color={colors.foreground} />}
              <Text style={[styles.buttonText, { color: colors.foreground }]}>
                {auth.pending ? "正在处理…" : auth.user ? "退出登录" : "打开网页登录"}
              </Text>
            </Pressable>
            {!!auth.code && (
              <>
                <Text
                  accessibilityLiveRegion="polite"
                  style={[styles.body, { color: colors.muted }]}
                >
                  请在登录页面核对授权码：{auth.code}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={cancelSignIn}
                  style={[styles.button, styles.apiButton]}
                >
                  <Text style={[styles.buttonText, { color: colors.foreground }]}>取消登录</Text>
                </Pressable>
              </>
            )}
            {!!auth.error && (
              <Text accessibilityRole="alert" style={[styles.body, { color: colors.error }]}>
                {auth.error}
              </Text>
            )}
          </View>

          <View style={[styles.api, { borderColor: colors.border }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={pending ? "调用中" : "调用 oRPC"}
              accessibilityState={{ disabled: pending, busy: pending }}
              disabled={pending}
              onPress={callApi}
              style={({ pressed }) => [
                styles.button,
                styles.apiButton,
                { backgroundColor: colors.secondary, opacity: pressed || pending ? 0.7 : 1 },
              ]}
            >
              {pending && <ActivityIndicator color={colors.foreground} />}
              <Text style={[styles.buttonText, { color: colors.foreground }]}>
                {pending ? "调用中…" : "调用 oRPC"}
              </Text>
            </Pressable>
            <Text
              accessibilityLiveRegion="polite"
              style={[styles.body, { color: failed ? colors.error : colors.muted }]}
            >
              {message}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: "center", padding: 24 },
  content: { width: "100%", maxWidth: 400, alignSelf: "center", gap: 28 },
  heading: { gap: 8 },
  title: { fontSize: 34, fontWeight: "600", letterSpacing: -0.6 },
  body: { fontSize: 16, lineHeight: 25 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  button: {
    minHeight: 48,
    minWidth: 48,
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  buttonText: { fontSize: 16, fontWeight: "500" },
  outline: { borderWidth: 1 },
  api: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 24, gap: 16 },
  apiButton: { alignSelf: "flex-start" },
})
