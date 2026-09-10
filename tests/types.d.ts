declare module 's3rver' {
  export default class S3rver {
    constructor(options: {
      port: number
      address: string
      silent: boolean
      directory: string
      configureBuckets?: { name: string; configs?: string[] }[]
    })
    run(): Promise<{ port: number; address: string }>
    close(): Promise<void>
  }
}
