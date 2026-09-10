import { useEffect, useRef, useState } from 'react'
import type { FileDto, FilePage } from '@voidmix/contracts'
import {
  Check,
  Download,
  FileImage,
  FileText,
  FolderOpen,
  RefreshCw,
  Trash2,
  Upload,
} from 'lucide-react'
import { Button } from './components/button'
import { Badge } from './components/badge'
import { Skeleton } from './components/skeleton'
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from './components/alert-dialog'
import { Notice } from './notice'

export interface FileActions {
  list(cursor?: string): Promise<FilePage>
  upload(file: File): Promise<void>
  download(id: string): Promise<void>
  remove(id: string): Promise<void>
}
export function FileWorkspace({ actions }: { actions: FileActions }) {
  const [page, setPage] = useState<FilePage>({ items: [] })
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const filesTitle = useRef<HTMLHeadingElement>(null)
  const filePicker = useRef<HTMLInputElement>(null)
  async function refresh(cursor?: string) {
    setLoading(true)
    setError('')
    try {
      setPage(await actions.list(cursor))
    } catch (error) {
      setError(error instanceof Error ? error.message : '读取失败')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    let active = true
    void actions
      .list()
      .then((page) => {
        if (active) setPage(page)
      })
      .catch(() => {
        if (active) setError('暂时无法读取文件，请重试')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [actions])
  async function run(action: () => Promise<void>, success?: string) {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      await action()
      if (success) {
        setMessage(success)
        await refresh()
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : '操作失败')
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className="workspace" aria-labelledby="files-title">
      <div className="section-title">
        <div>
          <h1 id="files-title" ref={filesTitle} tabIndex={-1}>
            你的文件
          </h1>
          <p>个人空间</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label="刷新文件"
          title="刷新文件"
          disabled={busy || loading}
          onClick={() => void refresh()}
        >
          <RefreshCw aria-hidden="true" />
        </Button>
      </div>
      <div className="upload">
        <Upload className="upload-symbol" aria-hidden="true" />
        <div className="upload-copy">
          <strong>{busy ? '正在处理文件…' : '把文件放进你的空间'}</strong>
          <p>PNG、JPEG、WebP、PDF、TXT</p>
        </div>
        <Button disabled={busy} onClick={() => filePicker.current?.click()}>
          <Upload aria-hidden="true" />
          上传文件
        </Button>
        <input
          ref={filePicker}
          className="file-picker"
          aria-label="选择文件"
          type="file"
          accept=".png,.jpg,.jpeg,.webp,.pdf,.txt"
          disabled={busy}
          onChange={(event) => {
            const file = event.target.files?.[0]
            event.target.value = ''
            if (file) void run(() => actions.upload(file), '文件上传成功')
          }}
        />
      </div>
      {error && <Notice error>{error}</Notice>}
      {message && <Notice success>{message}</Notice>}
      <div className="list-summary">
        <h2>文件列表</h2>
        {!loading && <span>本页 {page.items.length} 项</span>}
      </div>
      {loading ? (
        <div role="status" className="space-y-3 py-4">
          <span className="sr-only">正在读取文件…</span>
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} className="h-16 w-full" aria-hidden="true" />
          ))}
        </div>
      ) : !page.items.length ? (
        <div className="empty">
          <FolderOpen aria-hidden="true" />
          <h2>还没有文件</h2>
          <p>这里会收好你上传的文件。</p>
        </div>
      ) : (
        <table className="file-table">
          <caption className="sr-only">个人文件列表</caption>
          <thead>
            <tr>
              <th scope="col">文件名称</th>
              <th scope="col" className="file-date">
                上传日期
              </th>
              <th scope="col" className="file-status">
                状态
              </th>
              <th scope="col">操作</th>
            </tr>
          </thead>
          <tbody>
            {page.items.map((file: FileDto) => (
              <tr key={file.id}>
                <td className="file-name">
                  <div className="file-identity">
                    <span
                      className="file-symbol"
                      data-kind={file.contentType.startsWith('image/') ? 'image' : 'document'}
                    >
                      {file.contentType.startsWith('image/') ? (
                        <FileImage aria-hidden="true" />
                      ) : (
                        <FileText aria-hidden="true" />
                      )}
                    </span>
                    <div>
                      <strong>{file.fileName}</strong>
                      <small>{(file.size / 1024).toFixed(1)} KB</small>
                    </div>
                  </div>
                </td>
                <td className="file-date">{new Date(file.createdAt).toLocaleDateString()}</td>
                <td className="file-status">
                  <Badge
                    variant="secondary"
                    className="status-badge text-sm rounded-sm"
                    data-status={file.status}
                  >
                    {file.status === 'ready' && <Check aria-hidden="true" />}
                    {
                      {
                        pending: '等待上传',
                        ready: '已就绪',
                        deleting: '删除中',
                        deleted: '已删除',
                      }[file.status]
                    }
                  </Badge>
                </td>
                <td className="file-actions">
                  <div className="actions">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="下载"
                      title={`下载 ${file.fileName}`}
                      disabled={busy || file.status !== 'ready'}
                      onClick={() => void run(() => actions.download(file.id))}
                    >
                      <Download aria-hidden="true" />
                    </Button>
                    <DeleteFileDialog
                      file={file}
                      disabled={busy || file.status === 'deleting' || file.status === 'deleted'}
                      remove={() => actions.remove(file.id)}
                      onDeleted={() => {
                        setMessage('文件已加入删除队列')
                        setError('')
                        // The deleted row may disappear; return focus to the stable section heading.
                        filesTitle.current?.focus()
                        void refresh()
                      }}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="pagination">
        <Button variant="ghost" disabled={busy || loading} onClick={() => void refresh()}>
          返回最新
        </Button>
        {page.nextCursor && (
          <Button
            variant="outline"
            disabled={busy || loading}
            onClick={() => void refresh(page.nextCursor)}
          >
            查看更多
          </Button>
        )}
      </div>
    </section>
  )
}

function DeleteFileDialog({
  file,
  disabled,
  remove,
  onDeleted,
}: {
  file: FileDto
  disabled: boolean
  remove: () => Promise<void>
  onDeleted: () => void
}) {
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const removed = useRef(false)
  async function confirm() {
    setPending(true)
    setError('')
    try {
      await remove()
      removed.current = true
      setOpen(false)
    } catch (error) {
      setError(error instanceof Error ? error.message : '删除失败，请重试')
    } finally {
      setPending(false)
    }
  }
  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!pending) {
          setOpen(next)
          setError('')
        }
      }}
    >
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="删除"
          title={`删除 ${file.fileName}`}
          disabled={disabled}
        >
          <Trash2 aria-hidden="true" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent
        onCloseAutoFocus={(event) => {
          if (removed.current) {
            event.preventDefault()
            removed.current = false
            onDeleted()
          }
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>删除这份文件？</AlertDialogTitle>
          <AlertDialogDescription className="wrap-anywhere">
            “{file.fileName}”将从网页和桌面端移除。此操作无法撤销。
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && <Notice error>{error}</Notice>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>取消</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={pending}
            onClick={(event) => {
              event.preventDefault()
              void confirm()
            }}
          >
            {pending ? '正在删除…' : '确认删除'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
