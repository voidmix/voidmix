import { migrateDatabase } from "../src/migrate"

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error("请设置 DATABASE_URL，指向需要迁移的数据库。")
}

await migrateDatabase(connectionString)
console.log("数据库迁移完成。")
