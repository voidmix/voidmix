import Constants from "expo-constants"
import { Platform } from "react-native"

export function getApiOrigin() {
  const configured = process.env.EXPO_PUBLIC_API_URL
  if (configured) return new URL(configured).origin

  if (!__DEV__) {
    throw new Error("请配置 EXPO_PUBLIC_API_URL 后重新导出应用。")
  }

  if (Platform.OS !== "web" && Constants.expoConfig?.hostUri) {
    const host = new URL(`http://${Constants.expoConfig.hostUri}`)
    host.port = "3002"
    return host.origin
  }

  return Platform.OS === "android" ? "http://10.0.2.2:3002" : "http://127.0.0.1:3002"
}
