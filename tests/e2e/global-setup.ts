import { migrateDatabase } from "@voidmix/db/migrate"

export default async function globalSetup() {
  const url = process.env.E2E_DATABASE_URL
  if (!url) throw new Error("请设置 E2E_DATABASE_URL。")
  await migrateDatabase(url)
}
