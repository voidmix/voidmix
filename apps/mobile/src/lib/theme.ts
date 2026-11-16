import { useColorScheme } from "react-native"

const light = {
  background: "#ffffff",
  foreground: "#171717",
  muted: "#737373",
  border: "#e5e5e5",
  primary: "#171717",
  onPrimary: "#fafafa",
  secondary: "#f5f5f5",
  error: "#b91c1c",
}

const dark = {
  background: "#0a0a0a",
  foreground: "#fafafa",
  muted: "#a3a3a3",
  border: "#404040",
  primary: "#fafafa",
  onPrimary: "#171717",
  secondary: "#262626",
  error: "#fca5a5",
}

export function useTheme() {
  return useColorScheme() === "dark" ? dark : light
}
