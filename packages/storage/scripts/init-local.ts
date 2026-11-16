import { AwsClient } from "aws4fetch"

const endpoint = new URL(process.env.LOCAL_S3_ENDPOINT ?? "http://127.0.0.1:9000")
if (
  endpoint.protocol !== "http:" ||
  !["127.0.0.1", "localhost", "[::1]"].includes(endpoint.hostname) ||
  endpoint.pathname !== "/" ||
  endpoint.username ||
  endpoint.password ||
  endpoint.search ||
  endpoint.hash
) {
  throw new Error("storage:init 只支持本机 HTTP S3 服务。")
}

const client = new AwsClient({
  accessKeyId: "voidmix",
  secretAccessKey: "voidmix-local-storage",
  service: "s3",
  region: "us-east-1",
})
const bucket = new URL("/voidmix", endpoint).href
const options = { signal: AbortSignal.timeout(10_000) }
const existing = await client.fetch(bucket, { ...options, method: "HEAD" })
if (existing.ok) {
  console.log("本地 S3 bucket voidmix 已就绪。")
} else {
  if (existing.status !== 404) throw new Error(`无法读取本地 S3 bucket（${existing.status}）。`)
  const response = await client.fetch(bucket, { ...options, method: "PUT" })
  if (!response.ok) throw new Error(`创建本地 S3 bucket 失败（${response.status}）。`)
  console.log("已创建本地 S3 bucket voidmix。")
}
