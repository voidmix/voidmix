import { AwsClient } from "aws4fetch"

// Deployment uses its configured credentials; init-local keeps fixed loopback defaults.

function required(name: string) {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`请配置 ${name}。`)
  return value
}

const endpoint = new URL(required("S3_ENDPOINT"))
if (
  !["http:", "https:"].includes(endpoint.protocol) ||
  endpoint.username ||
  endpoint.password ||
  endpoint.search ||
  endpoint.hash
) {
  throw new Error("S3_ENDPOINT 必须是 HTTP(S) 服务地址。")
}
const bucket = required("S3_BUCKET")
if (!/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(bucket)) throw new Error("S3 bucket 名称无效。")
const region = required("S3_REGION")
const client = new AwsClient({
  service: "s3",
  region,
  accessKeyId: required("S3_ACCESS_KEY_ID"),
  secretAccessKey: required("S3_SECRET_ACCESS_KEY"),
})
const url = `${endpoint.href.replace(/\/$/, "")}/${encodeURIComponent(bucket)}`
const response = await client.fetch(url, { method: "HEAD", signal: AbortSignal.timeout(10_000) })
if (response.ok) {
  console.log("部署 S3 bucket 已就绪。")
} else {
  if (response.status !== 404) throw new Error(`无法读取 S3 bucket（${response.status}）。`)
  const creation = await client.fetch(url, {
    method: "PUT",
    signal: AbortSignal.timeout(10_000),
    ...(region !== "us-east-1"
      ? {
          headers: { "Content-Type": "application/xml" },
          body: `<CreateBucketConfiguration xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><LocationConstraint>${region.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</LocationConstraint></CreateBucketConfiguration>`,
        }
      : {}),
  })
  if (!creation.ok) throw new Error(`创建 S3 bucket 失败（${creation.status}）。`)
  console.log("已创建部署 S3 bucket。")
}
